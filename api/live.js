// Public, privacy-safe feed of real leads for the dashboard's "Live" mode.
// Only first names, area, the AI's fields, verdict and stage. No phone numbers, notes or recordings.
import { config } from "../lib/config.js";
import { listDeals, parseCallInfo } from "../lib/hubspot.js";

export default async function handler(req, res) {
  try {
    const s = config.stages;
    const stageName = {
      [s.new]: "New enquiry", [s.qualified]: "Qualified", [s.booked]: "Consultation booked",
      decisionmakerboughtin: "Site visit", contractsent: "Proposal sent", closedwon: "Won", [s.lost]: "Lost / Not a fit",
    };
    const deals = await listDeals();
    const calls = deals.map((d) => {
      const p = d.properties;
      const info = parseCallInfo(p.description) || {};
      const created = new Date(p.createdate);
      const ist = new Date(created.getTime() + 5.5 * 36e5);
      const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
      return {
        id: d.id,
        caller: (p.dealname || "Caller").split(" – ")[0].split(" ")[0],
        date: ist.toISOString().slice(0, 10),
        time: ist.toISOString().slice(11, 16),
        afterHours: mins < 600 || mins >= 1140,
        seconds: info.seconds || 0,
        cost: info.cost || 0,
        location: p.enquiry_location || null,
        property_type: p.property_type || null,
        carpet_area: p.carpet_area || null,
        scope: p.project_scope || null,
        timeline: p.project_timeline || null,
        decision_maker: p.decision_maker || null,
        source: p.enquiry_source || null,
        verdict: p.verdict || "unsure",
        reason: p.verdict_reason || null,
        stage: stageName[p.dealstage] || p.dealstage,
        test: /test/i.test(p.dealname || "") || /^(test|live-test)-/.test(info.callId || ""),
      };
    });
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ generatedAt: new Date().toISOString(), costPerMin: config.vaaniCostPerMin, calls });
  } catch (err) {
    res.status(500).json({ error: "Live data unavailable right now." });
  }
}
