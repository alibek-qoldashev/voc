-- Username bilan ro'yxatdan o'tish va kirish
-- Supabase -> SQL Editor -> New query -> shu faylni to'liq joylab Run.

-- 1) Profilga username: 3-20 belgi, faqat a-z, 0-9, "_" va "."; katta-kichik harf farqsiz noyob
alter table public.profiles add column if not exists username text;

do $$ begin
  alter table public.profiles
    add constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9_.]{3,20}$');
exception when duplicate_object then null;
end $$;

create unique index if not exists profiles_username_key
  on public.profiles (lower(username));

-- 2) Sign up paytida yuborilgan username'ni profilga yozadi
--    (Google orqali kirganlarda username bo'lmaydi — ular Google yoki email bilan kiradi)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, birth_date, username)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    nullif(lower(new.raw_user_meta_data ->> 'username'), '')
  );
  return new;
end;
$$;

-- 3) Sign up formasi uchun: username bandmi? (email'ni oshkor qilmaydi)
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(p_username));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- Username -> email qidiruvi atayin bu yerda yo'q: u istalgan odamga boshqalarning
-- emailini ochib bergan bo'lardi. Username bilan kirish "login-username" Edge Function
-- ichida service role orqali bajariladi va brauzerga email qaytarilmaydi.
