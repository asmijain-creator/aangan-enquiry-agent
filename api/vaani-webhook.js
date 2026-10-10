// Vaani → this endpoint after every call.
// On "call_postprocessing": write the handoff note, create the HubSpot deal, alert designers on Telegram.
import { config } from "../lib/config.js";
import { findCall, callDetails, normaliseEntities } from "../lib/vaani.js";
import { writeHandoffNote } from "../lib/gemini.js";
import { upsertContact, createDeal, findDealByCallId, addNote, dealUrl } from "../lib/hubspot.js";
import { sendMessage, esc } from "../lib/telegram.js";

const VERDICTS = ["qualified", "unsure", "not_a_fit", "urgent_existing_client"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = req.query?.key || req.headers["x-webhook-key"];
  if (config.webhookSecret && key !== config.webhookSecret) return res.status(401).json({ error: "bad key" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  if (body.event !== "call_postprocessing") return res.status(200).json({ ignored: body.event || "unknown" });

  try {
    const result = await processCall(body);
    return res.status(200).json(result);
  } catch (err) {
    console.error("vaani-webhook failed:", err);
    return res.status(500).json({ error: err.message });
  }
}

export async function processCall(body) {
  const data = body.data || body;
  const callId = data.call_id || body.call_id || data.room_name;
  const lead = normaliseEntities(data.entities);

  const existing = await findDealByCallId(callId);
  if (existing) return { duplicate: true, dealId: existing.id };

  // Cost and caller number only come from Vaani's call history.
  let history = null;
  try {
    history = await findCall(callId);
  } catch (err) {
    console.warn("Vaani history lookup failed:", err.message);
  }
  const callerNumber =
    (lead.phone_number && /\d{8,}/.test(lead.phone_number.replace(/\D/g, "")) && lead.phone_number) ||
    (history && (history.direction === "Outbound" ? history.to_number : history.from_number)) ||
    null;
  console.log("call_postprocessing payload keys:", Object.keys(body), Object.keys(data));
  let durationMs = Number(data.call_duration || data.duration_ms || body.call_duration || history?.duration_ms || 0);
  if (!durationMs) {
    // Live payloads have arrived without call_duration; Vaani's call details carry the call's speech length.
    try {
      const details = await callDetails(callId);
      durationMs = Number(details?.percentile_statistics?.usage?.stt?.total_speech_duration_ms || 0);
    } catch (err) {
      console.warn("Vaani call details lookup failed:", err.message);
    }
  }
  const durationSec = Math.round(durationMs / 1000);
  const costEstimated = history?.call_cost == null;
  const cost = costEstimated ? (durationSec / 60) * config.vaaniCostPerMin : Number(history.call_cost);

  const verdict = VERDICTS.includes(lead.verdict) ? lead.verdict : "unsure";
  const stage = {
    qualified: config.stages.qualified,
    unsure: config.stages.new,
    not_a_fit: config.stages.lost,
    urgent_existing_client: config.stages.new,
  }[verdict];

  let note = data.summary || "";
  let tokens = 0;
  try {
    ({ note, tokens } = await writeHandoffNote({ lead, summary: data.summary, transcript: data.transcript }));
  } catch (err) {
    console.warn("Gemini note failed, using Vaani summary:", err.message);
  }

  const contact = await upsertContact({ name: lead.customer_name, phone: callerNumber });
  const deal = await createDeal({
    lead: { ...lead, verdict },
    contactId: contact.id,
    stage,
    callId,
    seconds: durationSec,
    cost,
    costEstimated,
  });

  await addNote(
    deal.id,
    [
      "DESIGNER HANDOFF NOTE",
      note,
      "",
      `Call: ${callId} · ${durationSec}s · cost ₹${cost.toFixed(2)}${costEstimated ? " (estimated)" : ""} · AI note tokens ${tokens}`,
      data.recording_url ? `Recording: ${data.recording_url}` : "",
      contact.returning ? "Returning caller: this number has called before." : "",
    ]
      .filter(Boolean)
      .join("\n")
  );

  let telegramMessageId = null;
  if (verdict !== "not_a_fit") {
    const header =
      verdict === "urgent_existing_client"
        ? "🚨 <b>URGENT – existing client</b> (senior callback needed)"
        : verdict === "qualified"
          ? "🟢 <b>New qualified lead</b>"
          : "🟡 <b>Enquiry to check</b> (AI wasn't sure)";
    const text = [
      header,
      `<b>${esc(lead.customer_name || "Caller")}</b>${callerNumber ? ` · ${esc(callerNumber)}` : ""}`,
      contact.returning ? "↩️ Returning caller" : null,
      "",
      esc(note),
      "",
      `<i>Why: ${esc(lead.verdict_reason || "—")}</i>`,
    ]
      .filter((l) => l !== null)
      .join("\n");
    const buttons = [
      [
        { text: "✋ Claim", callback_data: `claim:${deal.id}` },
        { text: "❌ Not a fit", callback_data: `lost:${deal.id}` },
      ],
      [{ text: "Open in HubSpot", url: dealUrl(deal.id) }],
    ];
    const msg = await sendMessage(text, buttons);
    telegramMessageId = msg.message_id;
  }

  return { callId, verdict, dealId: deal.id, contactId: contact.id, cost, durationSec, telegramMessageId };
}
