// Shows which fields Vaani's call-details response contains for one call (values for cost/duration only).
// Run: node scripts/inspect-vaani-call.mjs <call_id>
import { config } from "../lib/config.js";

const id = process.argv[2] || "outbound-1791630369-e3f8d557";
const r = await fetch(`https://api.vaanivoice.ai/api/call_details/${id}`, { headers: { "X-API-Key": config.vaaniApiKey } });
const j = await r.json();
const walk = (o, p = "") =>
  Object.entries(o || {}).forEach(([k, v]) => {
    const path = p ? `${p}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) return walk(v, path);
    const show = /cost|duration|price|credit|minute|number|phone|direction|time/i.test(k);
    const safe = /phone|number/i.test(k) ? (v ? "(present)" : "(empty)") : JSON.stringify(v)?.slice(0, 60);
    console.log(path, show ? safe : "");
  });
walk(j);
