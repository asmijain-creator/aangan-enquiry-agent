// Writes private-links.txt with the two links that contain secrets (never printed to the console):
//  - the Vaani webhook URL to paste into Vaani → Developers → Webhooks
//  - Nikhil's dashboard link
// Run: node scripts/make-links.mjs https://your-app.vercel.app
import { writeFileSync } from "node:fs";
import { config } from "../lib/config.js";

const base = (process.argv[2] || "https://aangan-enquiry-agent-brown.vercel.app").replace(/\/$/, "");
writeFileSync(
  new URL("../private-links.txt", import.meta.url),
  [
    "PRIVATE: these links contain passwords. Don't share them publicly.",
    "",
    "1. Vaani webhook URL (paste into Vaani -> Developers -> Webhooks):",
    `${base}/api/vaani-webhook?key=${config.webhookSecret}`,
    "",
    "2. Nikhil's dashboard:",
    `${base}/api/dashboard?key=${config.dashboardKey}`,
    "",
  ].join("\n")
);
console.log("Wrote private-links.txt");
