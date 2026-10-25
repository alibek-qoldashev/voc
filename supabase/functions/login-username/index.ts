// Username + parol bilan kirish. Email brauzerga hech qachon qaytarilmaydi.
// Deploy:  supabase functions deploy login-username --no-verify-jwt
// (Hali kirmagan foydalanuvchi chaqiradi, shuning uchun JWT tekshiruvi o'chirilgan.
//  SUPABASE_URL, SUPABASE_ANON_KEY va SUPABASE_SERVICE_ROLE_KEY Supabase tomonidan avtomatik beriladi.)
import { createClient } from "npm:@supabase/supabase-js@2";

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

const url = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

// Topilmadi va parol noto'g'ri — bir xil javob, shunda username'larni taxmin qilib bo'lmaydi
const WRONG = { error: "invalid_credentials" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let username: unknown, password: unknown;
  try {
    ({ username, password } = await req.json());
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  if (typeof username !== "string" || typeof password !== "string" || !password) {
    return json({ error: "bad_request" }, 400);
  }
  const name = username.trim().toLowerCase();
  if (!/^[a-z0-9_.]{3,20}$/.test(name)) return json(WRONG, 401);

  const { data: profile, error: lookupError } = await admin
    .from("profiles")
    .select("email")
    .eq("username", name)
    .maybeSingle();
  if (lookupError) {
    console.error(lookupError);
    return json({ error: "server_error" }, 500);
  }
  if (!profile?.email) return json(WRONG, 401);

  // Har so'rov uchun alohida client: sessiya funksiya xotirasida qolib ketmaydi
  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({
    email: profile.email,
    password,
  });
  if (error) {
    if (error.code === "email_not_confirmed") return json({ error: "email_not_confirmed" }, 403);
    if (error.status === 429) return json({ error: "rate_limited" }, 429);
    return json(WRONG, 401);
  }

  return json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});
