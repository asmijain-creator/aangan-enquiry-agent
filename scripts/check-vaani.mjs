// Tests the Vaani API key (read-only) against a few endpoints.
// Run: node scripts/check-vaani.mjs
import { config } from "../lib/config.js";

if (config.vaaniApiKey && config.vaaniApiKey === config.geminiKey) {
  console.log("Note: VAANI_API_KEY is identical to GEMINI_API_KEY, so the wrong key was probably pasted.");
}
const tries = [
  ["call-history", "https://api.vaanivoice.ai/api/call-history?page=1&page_size=5"],
  ["call-history/", "https://api.vaanivoice.ai/api/call-history/?page=1&page_size=5"],
  ["agents", "https://api.vaanivoice.ai/api/agents"],
  ["call_details", "https://api.vaanivoice.ai/api/call_details/outbound-1791630369-e3f8d557"],
];
for (const [name, url] of tries) {
  const r = await fetch(url, { headers: { "X-API-Key": config.vaaniApiKey || "" } });
  const text = await r.text();
  let summary = "";
  try {
    const j = JSON.parse(text);
    if (r.ok && j.data) summary = `${j.pagination?.total_count ?? j.data.length} calls; latest cost ${j.data[0]?.call_cost}`;
    else summary = JSON.stringify(j.detail || j.message || Object.keys(j)).slice(0, 120);
  } catch {
    summary = text.slice(0, 80);
  }
  console.log(`${name.padEnd(14)} ${r.status}  ${summary}`);
}
