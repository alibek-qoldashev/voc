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
