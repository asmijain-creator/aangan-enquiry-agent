// Public health check: shows which parts of the system are connected, without revealing any keys.
// Open: /api/health
import { config } from "../lib/config.js";

async function check(fn) {
  try {
    return { ok: true, detail: await fn() };
  } catch (err) {
    return { ok: false, detail: err.message.replace(/bot[0-9]+:[^/]+/g, "bot***") };
  }
}

export default async function handler(req, res) {
  const [telegram, hubspot, gemini, vaani] = await Promise.all([
    check(async () => {
      const j = await (await fetch(`https://api.telegram.org/bot${config.telegramToken}/getMe`)).json();
      if (!j.ok) throw new Error(j.description);
      return `@${j.result.username}`;
    }),
    check(async () => {
      const r = await fetch("https://api.hubapi.com/crm/v3/pipelines/deals", { headers: { Authorization: `Bearer ${config.hubspotToken}` } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      return `pipeline "${j.results.find((p) => p.id === config.pipelineId)?.label || "?"}"`;
    }),
    check(async () => {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}`, { headers: { "x-goog-api-key": config.geminiKey } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return config.geminiModel;
    }),
    check(async () => {
      const r = await fetch("https://api.vaanivoice.ai/api/agents", { headers: { "X-API-Key": config.vaaniApiKey || "" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return "API key accepted";
    }),
  ]);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    app: "Aangan Enquiry Agent",
    checkedAt: new Date().toISOString(),
    allConnected: [telegram, hubspot, gemini, vaani].every((c) => c.ok),
    connections: { vaani, gemini, hubspot, telegram },
    webhooksProtected: Boolean(config.webhookSecret),
    dashboardProtected: Boolean(config.dashboardKey),
  });
}
