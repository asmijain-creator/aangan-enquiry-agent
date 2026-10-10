// Telegram → this endpoint when a designer taps a button on a lead alert.
// Claim → note on the deal; Consultation booked → stage moves; Not a fit → deal closed lost.
import { config } from "../lib/config.js";
import { setStage, addNote, dealUrl } from "../lib/hubspot.js";
import { editMessage, answerButton, esc } from "../lib/telegram.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (config.webhookSecret && req.headers["x-telegram-bot-api-secret-token"] !== config.webhookSecret) {
    return res.status(401).end();
  }
  const update = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  const cq = update.callback_query;
  if (!cq?.data) return res.status(200).json({ ignored: true });

  const [action, dealId] = cq.data.split(":");
  const who = [cq.from.first_name, cq.from.last_name].filter(Boolean).join(" ") || cq.from.username || "A designer";
  const time = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
  const original = esc(cq.message?.text || "");
  const hubspotRow = [{ text: "Open in HubSpot", url: dealUrl(dealId) }];

  try {
    if (action === "claim") {
      await addNote(dealId, `Claimed on Telegram by ${who} at ${time} IST.`);
      await editMessage(cq.message.chat.id, cq.message.message_id, `${original}\n\n✋ <b>Claimed by ${esc(who)}</b> at ${time}`, [
        [
          { text: "📅 Consultation booked", callback_data: `booked:${dealId}` },
          { text: "❌ Not a fit", callback_data: `lost:${dealId}` },
        ],
        hubspotRow,
      ]);
      await answerButton(cq.id, "It's yours. Please call them back now.");
    } else if (action === "booked") {
      await setStage(dealId, config.stages.booked);
      await addNote(dealId, `Consultation booked by ${who} at ${time} IST (via Telegram).`);
      await editMessage(cq.message.chat.id, cq.message.message_id, `${original}\n📅 <b>Consultation booked</b> by ${esc(who)} at ${time}`, [hubspotRow]);
      await answerButton(cq.id, "Marked as consultation booked in HubSpot.");
    } else if (action === "lost") {
      await setStage(dealId, config.stages.lost);
      await addNote(dealId, `Marked not a fit by ${who} at ${time} IST (via Telegram).`);
      await editMessage(cq.message.chat.id, cq.message.message_id, `${original}\n\n❌ <b>Not a fit</b>, marked by ${esc(who)} at ${time}`, [hubspotRow]);
      await answerButton(cq.id, "Closed as not a fit in HubSpot.");
    } else {
      await answerButton(cq.id, "Unknown action");
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("telegram-webhook failed:", err);
    await answerButton(cq.id, "Something went wrong. Please update HubSpot directly.").catch(() => {});
    return res.status(200).json({ error: err.message });
  }
}
