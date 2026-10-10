// Reads settings from environment variables (Vercel) or, when run locally, from .env.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const e = process.env;

export const config = {
  telegramToken: e.TELEGRAM_BOT_TOKEN,
  telegramGroupId: e.TELEGRAM_GROUP_CHAT_ID,
  hubspotToken: e.HUBSPOT_TOKEN,
  hubspotPortalId: e.HUBSPOT_PORTAL_ID,
  pipelineId: e.HUBSPOT_PIPELINE_ID || "default",
  stages: {
    new: e.HUBSPOT_STAGE_NEW || "appointmentscheduled",
    qualified: e.HUBSPOT_STAGE_QUALIFIED || "qualifiedtobuy",
    booked: e.HUBSPOT_STAGE_CONSULTATION_BOOKED || "presentationscheduled",
    lost: e.HUBSPOT_STAGE_LOST || "closedlost",
  },
  geminiKey: e.GEMINI_API_KEY,
  geminiModel: e.GEMINI_MODEL || "gemini-flash-latest",
  vaaniApiKey: e.VAANI_API_KEY,
  vaaniAgentId: e.VAANI_AGENT_ID,
  // Used when Vaani's call history doesn't return a cost. ₹17.39 for a 129 s test call ≈ ₹8.1/min.
  vaaniCostPerMin: Number(e.VAANI_COST_PER_MIN || 8.1),
  webhookSecret: e.WEBHOOK_SECRET,
  dashboardKey: e.DASHBOARD_KEY,
};
