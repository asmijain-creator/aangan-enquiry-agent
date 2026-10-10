// Prints a deal's Aangan fields and its notes, to check what the app wrote.
// Run: node scripts/show-deal.mjs <dealId>
import { config } from "../lib/config.js";

const id = process.argv[2];
const h = { Authorization: `Bearer ${config.hubspotToken}` };
const props = "dealname,dealstage,pipeline,verdict,verdict_reason,enquiry_location,property_type,carpet_area,project_scope,design_and_execution,project_timeline,decision_maker,budget_mentioned,enquiry_source,preferred_consultation_time";
const deal = await (await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${id}?properties=${props}&associations=notes,contacts`, { headers: h })).json();
for (const [k, v] of Object.entries(deal.properties)) if (v && !k.startsWith("hs_")) console.log(`${k.padEnd(28)} ${v}`);
console.log("contacts:", deal.associations?.contacts?.results?.length || 0);
for (const n of deal.associations?.notes?.results || []) {
  const note = await (await fetch(`https://api.hubapi.com/crm/v3/objects/notes/${n.id}?properties=hs_note_body`, { headers: h })).json();
  console.log("\n--- note ---\n" + note.properties.hs_note_body.replace(/<br>/g, "\n"));
}
