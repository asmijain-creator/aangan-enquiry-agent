// Replays the 20 September phone transcripts from enquiries.md through Gemini, using Nikhil's
// qualified.md rules, and writes data/replay-sept.json for the public dashboard.
// The case data is anonymised (per the brief). Run: node scripts/replay-september.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { config } from "../lib/config.js";

const root = new URL("../", import.meta.url);
const enquiries = readFileSync(new URL("enquiries.md", root), "utf8");
const qualified = readFileSync(new URL("qualified.md", root), "utf8");
const services = readFileSync(new URL("services.md", root), "utf8");
const COST_PER_MIN = config.vaaniCostPerMin;

// Split the phone section into calls: "### T01 · Phone · 2 September · 10:23am · 4 min 12 sec"
const phone = enquiries.split("## SECTION 2")[0];
const calls = [...phone.matchAll(/### (T\d+) · Phone · (\d+) September · ([^\n]+)\n([\s\S]*?)(?=\n### T\d+|\n---|$)/g)].map((m) => {
  const [, id, day, rest, body] = m;
  const time = (rest.match(/(\d{1,2}:\d{2}\s?[ap]m)/i) || [])[1] || null;
  const mins = [...rest.matchAll(/(\d+) min (\d+) sec/g)].map((x) => Number(x[1]) * 60 + Number(x[2]));
  const seconds = mins.length ? mins[mins.length - 1] : 0; // T17: use the reconnected call
  const missed = /MISSED CALL/i.test(rest);
  return { id, day: Number(day), time, seconds, missed, transcript: body.trim() };
});

function afterHours(time) {
  if (!time) return false;
  const [, h, m, ap] = time.match(/(\d{1,2}):(\d{2})\s?([ap]m)/i);
  let hour = Number(h) % 12 + (ap.toLowerCase() === "pm" ? 12 : 0);
  const mins = hour * 60 + Number(m);
  return mins < 600 || mins >= 1140; // before 10:00 or from 19:00
}

const schema = `{
  "caller": "first name, or a short descriptor like 'Son of owners' if no name; null if unknown",
  "location": "area in the caller's words, or null",
  "property_type": "flat | independent_house | villa | office | restaurant_retail_gym | other | null",
  "carpet_area": "e.g. '3BHK, 1,400 sq ft' or null",
  "scope": "rooms / scope in a few words, or null",
  "timeline": "their words, or null",
  "decision_maker": "yes | authorised | unclear | no",
  "budget_mentioned": "only if volunteered, else null",
  "source": "referral name, Instagram, LinkedIn etc., or null",
  "verdict": "qualified | unsure | not_a_fit | urgent_existing_client",
  "reason": "one short phrase, e.g. 'Passes all five tests' or 'Outside Pune and PCMC'",
  "tests": {"real_project": "pass|fail|unclear", "service_area": "pass|fail|unclear", "timeline": "pass|fail|unclear", "budget": "pass|fail|unclear", "decision_maker": "pass|fail|unclear"},
  "flags": ["short tags such as 'Asked for price', 'Referral', 'High value', 'Called before, not followed up', 'Redial', 'Rented flat'"],
  "next_action": "one line for the team, e.g. 'Designer calls back to book a site visit'",
  "handoff_note": "plain text, under 90 words, lines: WHO / PROJECT / TIMELINE / DECISION / IN THEIR WORDS / OPEN QUESTIONS. Never mention prices."
}`;

async function judge(call) {
  const prompt = `You are the qualification engine behind Aangan Studio's AI phone assistant.
Apply Nikhil's rubric exactly. Unclear on tests 1-3 -> "unsure". Unclear on 4 or 5 -> still "qualified" (note it).
Two or more clear fails, or out of scope/area -> "not_a_fit". An existing client complaining -> "urgent_existing_client".
A missed call with no conversation -> "unsure" with reason "No conversation: call back".
Never invent facts; use null when not said. Return ONLY JSON matching this shape:
${schema}

NIKHIL'S RUBRIC (qualified.md):
${qualified}

SERVICES (services.md):
${services}

CALL ${call.id} (${call.day} September, ${call.time || "time unknown"}${call.missed ? ", missed call" : ""}):
${call.transcript}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.geminiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8000, responseMimeType: "application/json" },
      }),
    });
    const j = await r.json();
    if (r.ok) {
      const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "{}";
      try {
        return { ...JSON.parse(text), tokens: j.usageMetadata?.totalTokenCount || 0 };
      } catch {
        console.warn(`${call.id} attempt ${attempt}: reply was cut off, retrying`);
        continue;
      }
    }
    console.warn(`${call.id} attempt ${attempt}: ${j.error?.message}`);
    await new Promise((res) => setTimeout(res, 3000 * attempt));
  }
  throw new Error(`Gemini failed for ${call.id}`);
}

const out = [];
for (const call of calls) {
  const t0 = Date.now();
  const v = await judge(call);
  const processingMs = Date.now() - t0;
  out.push({
    id: call.id,
    date: `2026-09-${String(call.day).padStart(2, "0")}`,
    time: call.time,
    afterHours: afterHours(call.time),
    seconds: call.seconds,
    missed: call.missed,
    cost: Math.round((call.seconds / 60) * COST_PER_MIN * 100) / 100,
    processingSeconds: Math.round(processingMs / 100) / 10,
    ...v,
    transcript: call.transcript,
  });
  console.log(`${call.id}  ${v.verdict.padEnd(22)} ${v.reason}  (${(processingMs / 1000).toFixed(1)}s)`);
}

mkdirSync(new URL("data/", root), { recursive: true });
writeFileSync(
  new URL("data/replay-sept.json", root),
  JSON.stringify({ generatedAt: new Date().toISOString(), model: config.geminiModel, costPerMin: COST_PER_MIN, calls: out }, null, 2)
);
console.log(`\nWrote data/replay-sept.json with ${out.length} calls`);
