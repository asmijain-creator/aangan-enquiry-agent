// Sends a realistic "call finished" event through the real pipeline, without a phone call:
// writes the AI handoff note, creates a HubSpot contact + deal, and posts the Telegram alert.
// Run: node scripts/simulate-call.mjs
import { processCall } from "../api/vaani-webhook.js";

const callId = `test-${Date.now()}`;

const payload = {
  event: "call_postprocessing",
  call_id: callId,
  data: {
    call_id: callId,
    call_duration: 129000,
    summary:
      "Priya called about a full home renovation for her 1,400 sq ft 3BHK in Kothrud, referred by Shruti Joshi. She wants design and execution, finished by March. She and her husband will decide together and prefer a weekday consultation.",
    entities: {
      "Customer Name": "Priya (test)",
      "Customer Intent": "Full home renovation for a 3BHK",
      verdict: "qualified",
      location: "Kothrud",
      property_type: "flat",
      carpet_area: "3BHK, 1400 sq ft",
      scope: "full home: kitchen, living room, both bedrooms",
      design_and_execution: "yes",
      timeline: "by March",
      decision_maker: "yes",
      budget_mentioned: "NA",
      source: "Referral: Shruti Joshi",
      phone_number: "NA",
      preferred_time: "any weekday",
      verdict_reason: "Full 3BHK in Kothrud, needs completion by March, owner is the decision-maker.",
    },
    transcript:
      "AGENT: Hello, I'm calling from Aangan Studio. How can I help you today?\nUSER: Hi, I'm Priya. Shruti Joshi gave me your number. We have a 3BHK in Kothrud, about 1,400 square feet, and want to redo the whole thing.\nAGENT: Are you looking for both design and execution?\nUSER: Yes, design and execution.\nAGENT: When are you hoping to have it finished?\nUSER: By March.\nAGENT: Are you the main decision-maker?\nUSER: Me and my husband will decide together.\nAGENT: What day and time suits you for a consultation?\nUSER: Any weekday works.",
  },
};

const result = await processCall(payload);
console.log(JSON.stringify(result, null, 2));
