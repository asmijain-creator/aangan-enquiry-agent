// Checks that the three keys in .env work, using read-only requests.
// Prints only OK / FAIL and harmless details, never the keys themselves.
// Run: node scripts/check-keys.mjs
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).trim()];
    })
);

async function check(name, fn) {
  try {
    console.log(`${name}: OK  ${await fn()}`);
  } catch (e) {
    console.log(`${name}: FAIL  ${e.message}`);
  }
}

await check("Telegram bot", async () => {
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.description);
  return `@${j.result.username}`;
});

await check("Telegram group", async () => {
  const r = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getChat?chat_id=${env.TELEGRAM_GROUP_CHAT_ID}`
  );
  const j = await r.json();
  if (!j.ok) throw new Error(j.description);
  return `"${j.result.title}" (${j.result.type})`;
});

await check("HubSpot", async () => {
  const r = await fetch("https://api.hubapi.com/crm/v3/pipelines/deals", {
    headers: { Authorization: `Bearer ${env.HUBSPOT_TOKEN}` },
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${j.message || ""}`);
  return j.results.map((p) => p.label).join(", ");
});

await check("Gemini", async () => {
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
    headers: { "x-goog-api-key": env.GEMINI_API_KEY },
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${j.error?.message || ""}`);
  const flash = j.models.map((m) => m.name.replace("models/", "")).filter((n) => n.includes("flash"));
  return `${j.models.length} models, e.g. ${flash.slice(0, 3).join(", ")}`;
});
