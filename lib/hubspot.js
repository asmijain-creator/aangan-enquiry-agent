import { config } from "./config.js";

const BASE = "https://api.hubapi.com";

async function hs(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${config.hubspotToken}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  const j = text ? JSON.parse(text) : {};
  if (!r.ok) throw new Error(`HubSpot ${method} ${path} → ${r.status} ${j.message || ""}`);
  return j;
}

// Finds the caller by phone number, or creates them.
export async function upsertContact({ name, phone }) {
  if (phone) {
    const found = await hs("POST", "/crm/v3/objects/contacts/search", {
      filterGroups: [{ filters: [{ propertyName: "phone", operator: "EQ", value: phone }] }],
      properties: ["firstname", "lastname", "phone"],
      limit: 1,
    });
    if (found.results?.length) return { id: found.results[0].id, returning: true };
  }
  const [firstname, ...rest] = (name || "Unknown caller").split(" ");
  const created = await hs("POST", "/crm/v3/objects/contacts", {
    properties: { firstname, lastname: rest.join(" "), phone: phone || "" },
  });
  return { id: created.id, returning: false };
}

// Custom deal properties created in HubSpot settings (internal name → field from Vaani).
const DEAL_FIELDS = {
  verdict: "verdict",
  verdict_reason: "verdict_reason",
  enquiry_location: "location",
  property_type: "property_type",
  carpet_area: "carpet_area",
  project_scope: "scope",
  design_and_execution: "design_and_execution",
  project_timeline: "timeline",
  decision_maker: "decision_maker",
  budget_mentioned: "budget_mentioned",
  enquiry_source: "source",
  preferred_consultation_time: "preferred_time",
};

// Vaani can resend the same event; the call ID is kept in the deal description to avoid duplicates.
export async function findDealByCallId(callId) {
  const j = await hs("POST", "/crm/v3/objects/deals/search", {
    filterGroups: [{ filters: [{ propertyName: "description", operator: "CONTAINS_TOKEN", value: callId }] }],
    limit: 1,
  });
  return j.results?.[0] || null;
}

// The description also carries call length and cost, because the free plan has no room for more custom fields.
// Format: "Vaani call <id> | <seconds>s | ₹<cost>[ est]"
export function parseCallInfo(description = "") {
  const m = description.match(/Vaani call (\S+) \| (\d+)s \| ₹([\d.]+)( est)?/);
  return m ? { callId: m[1], seconds: Number(m[2]), cost: Number(m[3]), estimated: !!m[4] } : null;
}

export async function createDeal({ lead, contactId, stage, callId, seconds, cost, costEstimated }) {
  const properties = {
    dealname: `${lead.customer_name || "Caller"} – ${[lead.carpet_area, lead.location].filter(Boolean).join(", ") || "enquiry"}`,
    pipeline: config.pipelineId,
    dealstage: stage,
    description: `Vaani call ${callId} | ${seconds}s | ₹${cost.toFixed(2)}${costEstimated ? " est" : ""}`,
  };
  for (const [prop, field] of Object.entries(DEAL_FIELDS)) {
    if (lead[field]) properties[prop] = String(lead[field]).slice(0, 1000);
  }
  return hs("POST", "/crm/v3/objects/deals", {
    properties,
    associations: [
      { to: { id: contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }] },
    ],
  });
}

// Adds a note to the deal's timeline (used for the handoff note, call cost and designer actions).
export async function addNote(dealId, text) {
  return hs("POST", "/crm/v3/objects/notes", {
    properties: { hs_timestamp: new Date().toISOString(), hs_note_body: text.replace(/\n/g, "<br>") },
    associations: [
      { to: { id: dealId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 214 }] },
    ],
  });
}

export async function setStage(dealId, stage) {
  return hs("PATCH", `/crm/v3/objects/deals/${dealId}`, { properties: { dealstage: stage } });
}

// All deals in the Aangan pipeline, for the dashboard.
export async function listDeals() {
  const out = [];
  let after;
  do {
    const j = await hs("POST", "/crm/v3/objects/deals/search", {
      filterGroups: [{ filters: [{ propertyName: "pipeline", operator: "EQ", value: config.pipelineId }] }],
      properties: ["dealname", "dealstage", "verdict", "verdict_reason", "createdate", "amount", "description", "enquiry_location",
        "property_type", "carpet_area", "project_scope", "project_timeline", "decision_maker", "enquiry_source",
        "preferred_consultation_time", `hs_v2_date_entered_${config.stages.booked}`, "closedate"],
      sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
      limit: 100,
      after,
    });
    out.push(...j.results);
    after = j.paging?.next?.after;
  } while (after && out.length < 1000);
  return out;
}

export function dealUrl(dealId) {
  return `https://app-na2.hubspot.com/contacts/${config.hubspotPortalId}/record/0-3/${dealId}`;
}
