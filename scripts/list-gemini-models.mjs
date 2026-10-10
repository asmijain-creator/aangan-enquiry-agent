// Lists the Gemini Flash models this API key can use, and checks which ones respond.
// Run: node scripts/list-gemini-models.mjs
import { config } from "../lib/config.js";

const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
  headers: { "x-goog-api-key": config.geminiKey },
});
const j = await r.json();
const names = j.models
  .filter((m) => m.supportedGenerationMethods?.includes("generateContent") && /flash/.test(m.name) && !/tts|image|audio|live/.test(m.name))
  .map((m) => m.name.replace("models/", ""));

for (const n of ["gemini-flash-latest", ...names]) {
  const t = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${n}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": config.geminiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: "Say OK" }] }] }),
  });
  console.log(t.status === 200 ? "works " : `${t.status}   `, n);
}
