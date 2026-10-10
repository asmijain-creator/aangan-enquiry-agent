import { config } from "./config.js";

const BASE = "https://api.vaanivoice.ai/api";

async function get(path) {
  if (!config.vaaniApiKey) return null;
  const r = await fetch(`${BASE}${path}`, { headers: { "X-API-Key": config.vaaniApiKey } });
  if (!r.ok) throw new Error(`Vaani ${path} → ${r.status}`);
  return r.json();
}

// Recent calls, newest first: cost, caller number, timings, entities.
export async function callHistory(pages = 1, pageSize = 200) {
  const all = [];
  for (let page = 1; page <= pages; page++) {
    const j = await get(`/call-history?page=${page}&page_size=${pageSize}`);
    if (!j) return all;
    all.push(...j.data);
    if (!j.pagination?.has_next) break;
  }
  return all;
}

// The history row for one call (cost and caller number aren't in the webhook payload).
export async function findCall(callId) {
  const calls = await callHistory(1, 50);
  return calls.find((c) => c.call_id === callId) || null;
}

// Vaani's extraction labels vary ("Customer Name", "customer_name"); normalise to snake_case.
export function normaliseEntities(entities = {}) {
  const out = {};
  for (const [k, v] of Object.entries(entities || {})) {
    const key = k.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const val = typeof v === "string" ? v.trim() : v;
    out[key] = val === "NA" || val === "N/A" || val === "" ? null : val;
  }
  return out;
}
