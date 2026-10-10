// After deploying, points the Telegram bot's button taps at the live app.
// Run: node scripts/set-telegram-webhook.mjs https://your-app.vercel.app
import { config } from "../lib/config.js";
import { setWebhook } from "../lib/telegram.js";

const base = process.argv[2];
if (!base) {
  console.log("Usage: node scripts/set-telegram-webhook.mjs https://your-app.vercel.app");
  process.exit(1);
}
await setWebhook(`${base.replace(/\/$/, "")}/api/telegram-webhook`, config.webhookSecret);
console.log("Telegram buttons now go to", `${base}/api/telegram-webhook`);
