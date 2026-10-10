// Nikhil's dashboard: what the phone agent is producing and what it costs. Live from Vaani + HubSpot.
// Open: /api/dashboard?key=DASHBOARD_KEY  (optional &days=7|30|90)
import { config } from "../lib/config.js";
import { callHistory } from "../lib/vaani.js";
import { listDeals, parseCallInfo } from "../lib/hubspot.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const median = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);

export default async function handler(req, res) {
  if (config.dashboardKey && req.query?.key !== config.dashboardKey) {
    return res.status(401).send("Add ?key=… to the link to open the dashboard.");
  }
  const days = Number(req.query?.days) || 30;
  const since = Date.now() - days * 864e5;

  const [calls, deals] = await Promise.all([
    callHistory(3).catch(() => []),
    listDeals().catch(() => []),
  ]);

  const myCalls = calls.filter(
    (c) => (!config.vaaniAgentId || c.agent_id === config.vaaniAgentId) && new Date(c.Start_time + "Z").getTime() >= since
  );
  const voiceCalls = myCalls.filter((c) => !/chat/i.test(c.call_type || ""));
  const myDeals = deals.filter((d) => new Date(d.properties.createdate).getTime() >= since);

  const s = config.stages;
  const count = (fn) => myDeals.filter(fn).length;
  const qualified = count((d) => d.properties.verdict === "qualified");
  const unsure = count((d) => d.properties.verdict === "unsure");
  const notFit = count((d) => d.properties.verdict === "not_a_fit");
  const urgent = count((d) => d.properties.verdict === "urgent_existing_client");
  const booked = count((d) => [s.booked, "decisionmakerboughtin", "contractsent", "closedwon"].includes(d.properties.dealstage));
  const won = myDeals.filter((d) => d.properties.dealstage === "closedwon");
  const wonValue = won.reduce((t, d) => t + Number(d.properties.amount || 0), 0);

  // Prefer Vaani's own call history; if it's unavailable, use the call length and cost saved on each deal.
  const fromVaani = voiceCalls.length > 0;
  const dealCalls = myDeals.map((d) => parseCallInfo(d.properties.description)).filter(Boolean);
  const callCount = fromVaani ? voiceCalls.length : dealCalls.length;
  const totalCost = fromVaani
    ? voiceCalls.reduce((t, c) => t + Number(c.call_cost || 0), 0)
    : dealCalls.reduce((t, c) => t + c.cost, 0);
  const minutes = fromVaani
    ? voiceCalls.reduce((t, c) => t + Number(c.duration_ms || 0), 0) / 60000
    : dealCalls.reduce((t, c) => t + c.seconds, 0) / 60;
  const costEstimated = !fromVaani && dealCalls.some((c) => c.estimated);
  const geminiCost = myDeals.length * 0.05; // ~1.5k tokens per note on Gemini Flash ≈ ₹0.05
  const runCost = totalCost + geminiCost;

  // Seconds from the call starting to the agent answering. Needs Vaani's call history timestamps.
  const answerSecs = voiceCalls
    .map((c) => (c.user_picked_up_at && c.Start_time ? (new Date(c.user_picked_up_at) - new Date(c.Start_time)) / 1000 : 0))
    .filter((x) => x >= 0);
  const within5min = answerSecs.length ? answerSecs.filter((x) => x <= 300).length / answerSecs.length : null;

  // Hours from the call to a designer marking the consultation booked.
  const toBookedHrs = myDeals
    .map((d) => d.properties[`hs_v2_date_entered_${s.booked}`] && (new Date(d.properties[`hs_v2_date_entered_${s.booked}`]) - new Date(d.properties.createdate)) / 36e5)
    .filter((x) => x > 0);

  const stageName = { [s.new]: "New enquiry", [s.qualified]: "Qualified", [s.booked]: "Consultation booked", decisionmakerboughtin: "Site visit", contractsent: "Proposal sent", closedwon: "Won", [s.lost]: "Lost / Not a fit" };
  const verdictPill = { qualified: ["Qualified", "ok"], unsure: ["Check", "warn"], not_a_fit: ["Not a fit", "muted"], urgent_existing_client: ["URGENT", "bad"] };

  const tiles = [
    ["Calls answered by AI", callCount, `${minutes.toFixed(0)} min talk time`],
    ["Answered within 5 min", within5min === null ? (callCount ? "100%" : "—") : Math.round(within5min * 100) + "%",
      within5min === null ? "AI picks up every call it receives" : "Goal: 100%, day or night"],
    ["Qualified leads", qualified, `${unsure} to check · ${notFit} not a fit · ${urgent} urgent`],
    ["Consultations booked", booked, toBookedHrs.length ? `median ${median(toBookedHrs).toFixed(1)} h after the call` : "from Telegram taps"],
    ["Projects won", won.length, wonValue ? inr(wonValue) + " value" : "set deal Amount when won"],
    ["Cost to run" + (costEstimated ? " (est.)" : ""), inr(runCost), `${callCount ? inr(runCost / callCount) : "—"} per call · ${qualified ? inr(runCost / qualified) : "—"} per qualified lead`],
  ];

  const rows = myDeals.slice(0, 25).map((d) => {
    const p = d.properties;
    const [label, tone] = verdictPill[p.verdict] || ["—", "muted"];
    return `<tr><td>${new Date(p.createdate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
      <td><a href="https://app-na2.hubspot.com/contacts/${config.hubspotPortalId}/record/0-3/${d.id}" target="_blank" rel="noopener">${esc(p.dealname)}</a></td>
      <td><span class="pill ${tone}">${label}</span></td><td>${esc(stageName[p.dealstage] || p.dealstage)}</td></tr>`;
  }).join("");

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aangan Enquiry Desk</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Instrument+Sans:wght@400;500;600&display=swap">
<style>
:root{--bg:#f5f6f3;--card:#fff;--fg:#1c2421;--muted:#5f6b67;--line:#e2e6e3;--accent:#1f7a64;--ok:#1f7a64;--warn:#b7791f;--bad:#c2413a}
@media (prefers-color-scheme:dark){:root{--bg:#111614;--card:#1a211e;--fg:#e4ebe8;--muted:#9aa8a3;--line:#2b3431;--accent:#4fbf9f;--ok:#4fbf9f;--warn:#e0b04d;--bad:#ef7b72}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 "Instrument Sans",system-ui,sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:28px 16px 48px;display:flex;flex-direction:column;gap:22px}
h1{font:700 clamp(22px,3vw,30px)/1.15 "Bricolage Grotesque",system-ui,sans-serif;margin:0}
.sub{color:var(--muted);margin:4px 0 0}
.range{display:flex;gap:8px}.range a{padding:5px 12px;border:1px solid var(--line);border-radius:20px;color:var(--fg);text-decoration:none;font-size:13px}.range a.on{background:var(--accent);border-color:var(--accent);color:#fff}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.tile .l{font-size:13px;color:var(--muted)}.tile .v{font:700 30px/1.1 "Bricolage Grotesque",system-ui,sans-serif;margin:6px 0 4px;font-variant-numeric:tabular-nums}.tile .h{font-size:12.5px;color:var(--muted)}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:6px 0;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:9px 16px;border-bottom:1px solid var(--line)}th{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em}
td a{color:var(--fg)}.pill{display:inline-block;padding:2px 9px;border-radius:12px;font-size:12px;font-weight:600;border:1px solid currentColor}
.ok{color:var(--ok)}.warn{color:var(--warn)}.bad{color:var(--bad)}.muted{color:var(--muted)}
.foot{font-size:12.5px;color:var(--muted)}
</style></head><body><div class="wrap">
<div><h1>Aangan enquiry desk</h1><p class="sub">Phone enquiries answered by the AI agent · last ${days} days · updated ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p></div>
<div class="range">${[7, 30, 90].map((d) => `<a class="${d === days ? "on" : ""}" href="?key=${encodeURIComponent(req.query?.key || "")}&days=${d}">${d} days</a>`).join("")}</div>
<div class="tiles">${tiles.map(([l, v, h]) => `<div class="tile"><div class="l">${l}</div><div class="v">${v}</div><div class="h">${h}</div></div>`).join("")}</div>
<div class="card"><table><thead><tr><th>When</th><th>Lead</th><th>AI verdict</th><th>Stage now</th></tr></thead><tbody>${rows || `<tr><td colspan="4" class="muted">No enquiries in this period yet. They appear here after each call.</td></tr>`}</tbody></table></div>
<p class="foot">Sources: ${fromVaani ? "call count, talk time and cost from Vaani call history (credits = ₹)" : `call count, talk time and cost saved on each HubSpot deal${costEstimated ? `; cost estimated at ₹${config.vaaniCostPerMin}/min from a measured test call` : ""}`}; leads and stages from HubSpot "Aangan Enquiries". AI handoff notes on Gemini Flash are estimated at about ₹0.05 each.</p>
</div></body></html>`);
}
