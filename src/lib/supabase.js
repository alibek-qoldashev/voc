import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

// PKCE: Google va parol tiklash havolalari ?code=... bilan qaytadi,
// client uni o'zi sessiyaga almashtiradi (hash'dagi tokenlardan ishonchliroq)
export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-key', {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Supabase'da shu kirish usuli (masalan "google") yoqilganmi? Yoqilmagan bo'lsa
// foydalanuvchini Supabase'ning JSON xato sahifasiga yubormaymiz.
export async function providerEnabled(name) {
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!res.ok) return true; // tekshirib bo'lmasa, odatdagidek urinib ko'ramiz
    const settings = await res.json();
    return Boolean(settings.external?.[name]);
  } catch {
    return true;
  }
}
