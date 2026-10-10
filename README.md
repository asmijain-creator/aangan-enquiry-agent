# Aangan Enquiry Agent

Every phone enquiry to Aangan Studio is answered in seconds by an AI voice agent (Vaani). When the call ends, this app:

1. **Writes a designer handoff note** with Gemini, from the call's extracted fields and transcript.
2. **Creates a HubSpot contact and deal** in the "Aangan Enquiries" pipeline, with all qualification fields filled in and the note on the timeline.
3. **Posts an alert in the "Aangan Leads" Telegram group** with **Claim / Consultation booked / Not a fit** buttons. Each tap updates HubSpot.
4. **Feeds Nikhil's dashboard**: calls answered, qualified leads, consultations booked, wins and the cost to run, live from Vaani and HubSpot.

```
Caller ─► Vaani voice agent ─(call_postprocessing webhook)─► /api/vaani-webhook
                                                              ├─ Gemini: handoff note
                                                              ├─ HubSpot: contact + deal + note
                                                              └─ Telegram: alert with buttons
Designer taps a button ─► /api/telegram-webhook ─► HubSpot stage + note
Nikhil ─► /api/dashboard?key=… ─► Vaani call history + HubSpot deals
```

## Where it runs

- **Live app:** https://aangan-enquiry-agent-brown.vercel.app (Vercel project `aangan-enquiry-agent`)
- **Code:** https://github.com/asmijain-creator/aangan-enquiry-agent. Every push to `main` deploys automatically.
- **Keys:** stored in Vercel → Settings → Environment Variables, and locally in `.env`. Neither is in git.
- **Vaani webhook and dashboard links:** run `node scripts/make-links.mjs` to write them to `private-links.txt`.

## Files

| Path | What it does |
|---|---|
| `api/vaani-webhook.js` | Receives Vaani's after-call event and runs steps 1–3 |
| `api/telegram-webhook.js` | Handles designers' button taps |
| `api/dashboard.js` | Nikhil's dashboard page |
| `lib/` | Small clients for Vaani, Gemini, HubSpot and Telegram |
| `scripts/check-keys.mjs` | Tests the keys in `.env` (read-only) |
| `scripts/simulate-call.mjs` | Runs a pretend call through the real pipeline |
| `scripts/show-deal.mjs` | Prints what the app wrote to a HubSpot deal |
| `scripts/set-telegram-webhook.mjs` | Points Telegram button taps at the deployed app |
| `.env` | Keys and settings. **Never share or upload.** |

## Run locally

```bash
node scripts/check-keys.mjs
```

```bash
node scripts/simulate-call.mjs
```

No packages are needed; Node 20 or later is enough.

## Rules the system follows

- The AI never quotes a price (from `pricing.md`); designers give estimates at the consultation.
- Every field comes from what the caller said; anything not asked is marked "not asked".
- AI qualifies, people decide: designers claim leads, and only they close a lead as not a fit or move it to booked.
- HubSpot's free plan allows only a few custom fields, so call cost comes from Vaani's call history, not a HubSpot field.
