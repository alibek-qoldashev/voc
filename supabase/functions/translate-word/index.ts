// So'zni tarjima qiladi (navbardagi Translate oynasi).
// en -> uz: inglizcha ta'rif, o'zbekcha tarjima, sinonimlar, CEFR darajasi
// uz -> en: inglizcha so'z(lar), sinonimlar, CEFR darajasi
// Deploy:  supabase functions deploy translate-word
// Kalit:   ANTHROPIC_API_KEY secret (extract-words bilan bir xil)
// Supabase JWT tekshiruvi yoqilgan (standart), shuning uchun faqat kirgan foydalanuvchilar chaqira oladi.
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@1.3.0/helpers/zod";
import { z } from "npm:zod@4.6.7";

const MODEL = "claude-haiku-5-5";
const MAX_TEXT = 80;
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const Result = z.object({
  found: z.boolean(),
  english: z.string(),
  definition: z.string(),
  uzbek: z.string(),
  synonyms: z.array(z.string()),
  level: z.enum(LEVELS),
});

const prompt = (text: string, from: "en" | "uz") =>
  from === "en"
    ? `A learner of English typed this English word or short phrase: "${text}".
Return:
- english: the word in its dictionary form (fix an obvious typo).
- definition: one short, plain English definition of its most common meaning.
- uzbek: its Uzbek translation in Latin script; give up to three meanings separated by commas if it has several common ones.
- synonyms: up to five common English synonyms (empty if there are none).
- level: its CEFR level (A1-C2) for the most common meaning.
- found: false if this is not a real English word or phrase; then leave the other text fields empty and use A1.`
    : `A learner of English typed this Uzbek word or short phrase: "${text}".
Return:
- english: the best English translation; give up to three if several are common, separated by commas.
- definition: leave empty.
- uzbek: the Uzbek word as written, in Latin script.
- synonyms: up to five English synonyms of the main translation (empty if there are none).
- level: the CEFR level (A1-C2) of the main English translation.
- found: false if this is not a real Uzbek word or phrase; then leave the other text fields empty and use A1.`;

const client = new Anthropic(); // ANTHROPIC_API_KEY secret'dan o'qiladi

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let text: string, from: string;
  try {
    ({ text, from } = await req.json());
  } catch {
    return json({ error: "Send JSON: { text, from }" }, 400);
  }
  text = typeof text === "string" ? text.trim() : "";
  if (!text) return json({ error: "No text" }, 400);
  if (text.length > MAX_TEXT) return json({ error: "Text is too long" }, 413);
  if (from !== "en" && from !== "uz") return json({ error: "from must be en or uz" }, 400);

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt(text, from) }],
      output_config: { format: zodOutputFormat(Result) },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return json({ error: "Could not translate this word" }, 502);
    }
    const r = response.parsed_output;
    return json({
      found: r.found,
      english: r.english.trim(),
      definition: r.definition.trim(),
      uzbek: r.uzbek.trim(),
      synonyms: r.synonyms.map((s) => s.trim()).filter(Boolean).slice(0, 5),
      level: r.level,
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json({ error: "Too many requests, try again in a minute" }, 429);
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("ANTHROPIC_API_KEY is missing or invalid");
      return json({ error: "Translation is not set up yet" }, 500);
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`Claude API error ${err.status}:`, err.message);
      return json({ error: "Could not translate this word" }, 502);
    }
    console.error(err);
    return json({ error: "Something went wrong" }, 500);
  }
});
