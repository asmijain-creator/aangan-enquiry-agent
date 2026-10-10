// Asks Vaani to call a number with the Aangan agent (for live end-to-end tests).
// Run: node scripts/call-me.mjs +91XXXXXXXXXX
import { config } from "../lib/config.js";

const number = process.argv[2];
if (!number) {
  console.log("Usage: node scripts/call-me.mjs +91XXXXXXXXXX");
  process.exit(1);
}
const r = await fetch("https://api.vaanivoice.ai/api/trigger-call/", {
  method: "POST",
  headers: { "X-API-Key": config.vaaniApiKey, "Content-Type": "application/json" },
  body: JSON.stringify({ agent_id: config.vaaniAgentId, contact_number: number, name: process.argv[3] || "Test caller" }),
});
const text = await r.text();
console.log("status", r.status);
console.log(text.slice(0, 400));
