import { config } from "./config.js";

// Writes the designer handoff note from the call's extracted fields and transcript.
export async function writeHandoffNote({ lead, summary, transcript }) {
  const prompt = `You write handoff notes for designers at Aangan Studio, an interior design studio in Pune.
A caller spoke to the studio's AI phone assistant. Write a note a designer can read in 20 seconds before calling them back.

Rules:
- Plain text, no markdown symbols. Under 120 words.
- Use only facts from the data below. If something wasn't asked, write "not asked". Never invent details.
- Never mention prices or estimates.
- Structure exactly:
WHO: name, how they found us
PROJECT: property type, location, size, scope
TIMELINE: their words
DECISION: who decides
IN THEIR WORDS: one short quote from the caller that captures what they want
OPEN QUESTIONS: 1-3 things the designer should ask first
FIRST CALL: one sentence on how to open the call

Extracted fields: ${JSON.stringify(lead)}
Call summary: ${summary || "none"}
Transcript:
${(transcript || "").slice(0, 6000)}`;

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.geminiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2000 },
      }),
    }
  );
  const j = await r.json();
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${j.error?.message}`);
  const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim();
  return { note: text || summary || "", tokens: j.usageMetadata?.totalTokenCount || 0 };
}
