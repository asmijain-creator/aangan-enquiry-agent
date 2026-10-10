// Sends a pretend "call finished" event to the LIVE app, exactly as Vaani would.
// Run: node scripts/test-live.mjs https://your-app.vercel.app
import { config } from "../lib/config.js";

const base = (process.argv[2] || "https://aangan-enquiry-agent-brown.vercel.app").replace(/\/$/, "");
const callId = `live-test-${Date.now()}`;
const body = {
  event: "call_postprocessing",
  call_id: callId,
  data: {
    call_id: callId,
    call_duration: 95000,
    summary: "Ritu from Pimple Saudagar wants kitchen, wardrobes and living room done in her 3BHK of about 1,050 sq ft, ideally by March. She is the owner.",
    entities: {
      "Customer Name": "Ritu (live test)",
      verdict: "qualified",
      location: "Pimple Saudagar",
      property_type: "flat",
      carpet_area: "3BHK, 1050 sq ft",
      scope: "kitchen, wardrobes, living room",
      design_and_execution: "yes",
      timeline: "by March",
      decision_maker: "yes",
      source: "not asked",
      preferred_time: "weekday evening",
      verdict_reason: "3BHK in PCMC, full design and execution, March timeline, owner deciding.",
    },
    transcript: "USER: Hi, I'm Ritu from Pimple Saudagar. 3BHK, about 1,050 sq ft. We moved in with builder furniture and want kitchen, wardrobes and living room done, ideally by March.",
  },
};

const r = await fetch(`${base}/api/vaani-webhook?key=${encodeURIComponent(config.webhookSecret)}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
console.log("status", r.status);
console.log(await r.text());
