# Mind Pro + Supabase: sozlash

1. Paketlar:        npm install @supabase/supabase-js react-router-dom
2. Fayllarni almashtiring: eski `src/` papkasini o'chirib, shu arxivdagi `src/` ni qo'ying
   (ham `index.html` ni). `vite.config.js` va `package.json` o'zgarmaydi.
3. Supabase: supabase.com -> New project.
4. SQL Editor -> New query -> `supabase/schema.sql` ni to'liq joylab Run.
5. Project Settings -> API: Project URL va anon (publishable) kalitni ko'chiring.
6. Loyiha ildizida `.env` yarating (`.env.example` ga qarang), keyin `npm run dev`.
7. Authentication -> Providers -> Email: dev vaqtida "Confirm email" ni o'chirib qo'ying
   (aks holda sign up'dan keyin email tasdiqlash kerak bo'ladi).
8. Google login (ixtiyoriy): Authentication -> Providers -> Google, Google Cloud'dan
   Client ID/Secret kiriting. Authentication -> URL Configuration -> Redirect URLs ga
   http://localhost:5173/home qo'shing.

## Kartalardagi rasmlar va rasmdan import (2026-10-25)

1. SQL Editor -> New query -> `supabase/migrations/20261025_card_images_order.sql` ni joylab Run.
   Bu kartalarga `term_image`, `definition_image`, `position` ustunlarini va `card-images`
   bucket'ini qo'shadi. **Bu qadamsiz deck sahifalari ochilmaydi** (ilova `position` bo'yicha tartiblaydi).
2. Rasmdan import (Create deck -> Import -> Photo) Claude Haiku orqali ishlaydi:
   - Anthropic Console'dan API kalit oling: https://console.anthropic.com
   - Supabase CLI o'rnating va loyihani ulang: `supabase login`, `supabase link --project-ref <ref>`
   - Kalitni secret qilib qo'ying: `supabase secrets set ANTHROPIC_API_KEY=<kalit>`
     (kalitni hech qachon `.env` yoki frontend kodiga qo'ymang)
   - Funksiyani deploy qiling: `supabase functions deploy extract-words`

## Username bilan kirish, parolni tiklash va Google (2026-10-25)

1. SQL Editor -> `supabase/migrations/20261025_usernames.sql` ni Run qiling
   (profilga `username`, sign up trigger'i va `username_available` funksiyasi).
2. Username bilan kirish funksiyasini deploy qiling (hali kirmagan foydalanuvchi chaqiradi,
   shuning uchun JWT tekshiruvi o'chiriladi):
   `supabase functions deploy login-username --no-verify-jwt`
   Bu deploy qilinmaguncha ham email + parol bilan kirish ishlayveradi.
3. Authentication -> URL Configuration:
   - Site URL: asosiy domeningiz (masalan Vercel manzili)
   - Redirect URLs ga qo'shing (Google va parol tiklash havolalari shu yerga qaytadi):
     `http://localhost:5173/**`, `http://localhost:5174/**`, `https://<vercel-domeningiz>/**`
4. Authentication -> Providers -> Google yoqilgan bo'lsin. Google Cloud Console'da
   "Authorized redirect URI" sifatida `https://<project-ref>.supabase.co/auth/v1/callback` turishi kerak.
