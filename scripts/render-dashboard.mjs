// Renders the dashboard locally to dashboard-preview.html (same code that runs online).
// Run: node scripts/render-dashboard.mjs
import { writeFileSync } from "node:fs";
import { config } from "../lib/config.js";
import handler from "../api/dashboard.js";

const res = {
  code: 200,
  headers: {},
  setHeader(k, v) { this.headers[k] = v; },
  status(c) { this.code = c; return this; },
  send(body) { writeFileSync(new URL("../dashboard-preview.html", import.meta.url), body); console.log(`status ${this.code}, wrote dashboard-preview.html (${body.length} bytes)`); },
};
await handler({ query: { key: config.dashboardKey, days: "30" } }, res);
