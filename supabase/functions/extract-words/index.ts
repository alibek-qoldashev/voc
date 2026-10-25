// Rasmdan so'z va ta'riflarni ajratib oladi (Create deck -> Import -> Photo).
// Deploy:  supabase functions deploy extract-words
// Kalit:   supabase secrets set ANTHROPIC_API_KEY=...
// Supabase JWT tekshiruvi yoqilgan (standart), shuning uchun faqat kirgan foydalanuvchilar chaqira oladi.
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@1.3.0/helpers/zod";
import { z } from "npm:zod@4.6.7";

const MODEL = "claude-haiku-5-5";
const MAX_BASE64 = 7_000_000; // ~5 MB rasm
const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

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

const WordList = z.object({
  cards: z.array(
    z.object({
      term: z.string(),
      definition: z.string(),
    }),
  ),
});

const PROMPT = `This image is from a language learner's notes, textbook, or vocabulary list.
Find every vocabulary item in it and return each one as a term with its definition.

- The term is the word or phrase being learned. The definition is its meaning, translation, or explanation as written in the image.
- Keep both exactly as written, in their original language. Fix only obvious OCR slips, such as a broken letter.
- If an item has no meaning written next to it, write a short, plain English definition yourself.
- Skip headings, page numbers, exercise instructions, and example sentences that are not vocabulary items.
- If the image has no vocabulary items, return an empty list.`;

const client = new Anthropic(); // ANTHROPIC_API_KEY secret'dan o'qiladi

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let image: string, mediaType: string;
  try {
    ({ image, mediaType } = await req.json());
  } catch {
    return json({ error: "Send JSON: { image, mediaType }" }, 400);
  }
  if (typeof image !== "string" || !image) return json({ error: "No image" }, 400);
  if (image.length > MAX_BASE64) return json({ error: "Image is too large" }, 413);
  if (!MEDIA_TYPES.includes(mediaType as (typeof MEDIA_TYPES)[number])) {
    return json({ error: "Unsupported image type" }, 400);
  }

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as (typeof MEDIA_TYPES)[number],
                data: image,
              },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(WordList) },
    });

    if (response.stop_reason === "refusal") {
      return json({ error: "This image could not be processed" }, 422);
    }
    if (!response.parsed_output) {
      return json({ error: "Could not read words from this image" }, 502);
    }

    const cards = response.parsed_output.cards
      .map((c) => ({ term: c.term.trim(), definition: c.definition.trim() }))
      .filter((c) => c.term);
    return json({ cards });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json({ error: "Too many requests, try again in a minute" }, 429);
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("ANTHROPIC_API_KEY is missing or invalid");
      return json({ error: "Photo import is not set up yet" }, 500);
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`Claude API error ${err.status}:`, err.message);
      return json({ error: "Could not read words from this image" }, 502);
    }
    console.error(err);
    return json({ error: "Something went wrong" }, 500);
  }
});
