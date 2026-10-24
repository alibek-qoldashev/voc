-- =====================================================================
-- Mind Pro — Supabase sxemasi
-- Supabase Dashboard -> SQL Editor -> New query -> hammasini joylab "Run"
-- =====================================================================

-- 1) FOYDALANUVCHI PROFILI (auth.users bilan bog'langan) ---------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  birth_date  date,
  new_per_day int  not null default 20,   -- kuniga nechta yangi karta
  created_at  timestamptz not null default now()
);

-- Sign up paytida yuborilgan tug'ilgan sanani profilga yozadi
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, birth_date)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'birth_date', '')::date);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) DECKLAR ------------------------------------------------------------
create table public.decks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null,
  description      text,
  created_at       timestamptz not null default now(),
  last_studied_at  timestamptz
);

-- 3) KARTALAR (SRS maydonlari shu jadvalning o'zida) ---------------------
create table public.cards (
  id            uuid primary key default gen_random_uuid(),
  deck_id       uuid not null references public.decks (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  term          text not null,
  definition    text not null default '',
  translation   text not null default '',
  example       text not null default '',
  -- Anki'ga o'xshash takrorlash holati
  srs_state     text not null default 'new' check (srs_state in ('new', 'learning', 'review')),
  ease          real not null default 2.5,
  interval_days int  not null default 0,
  due           timestamptz not null default now(),
  reps          int  not null default 0,
  lapses        int  not null default 0,
  created_at    timestamptz not null default now()
);
create index cards_deck_idx     on public.cards (deck_id);
create index cards_user_due_idx on public.cards (user_id, srs_state, due);

-- 4) TAKRORLASH TARIXI (Home sahifadagi "recent" va statistika uchun) ------
create table public.review_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id     uuid not null references public.cards (id) on delete cascade,
  deck_id     uuid not null references public.decks (id) on delete cascade,
  rating      smallint not null check (rating between 0 and 3), -- 0 Again, 1 Hard, 2 Good, 3 Easy
  was_new     boolean not null default false,
  reviewed_at timestamptz not null default now()
);
create index review_logs_user_time_idx on public.review_logs (user_id, reviewed_at desc);

-- 5) DECK STATISTIKASI (jami / yangi / hozir takrorlanadigan) -------------
create view public.deck_stats with (security_invoker = true) as
select
  d.id as deck_id,
  count(c.id)                                                          as total,
  count(c.id) filter (where c.srs_state = 'new')                       as new_count,
  count(c.id) filter (where c.srs_state <> 'new' and c.due <= now())   as due_count
from public.decks d
left join public.cards c on c.deck_id = d.id
group by d.id;

-- 6) XAVFSIZLIK: har kim faqat o'z ma'lumotini ko'radi (RLS) ---------------
alter table public.profiles    enable row level security;
alter table public.decks       enable row level security;
alter table public.cards       enable row level security;
alter table public.review_logs enable row level security;

create policy "profile: o'qish"     on public.profiles for select using (auth.uid() = id);
create policy "profile: yangilash"  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "decks: hammasi" on public.decks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "cards: hammasi" on public.cards for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.decks d where d.id = deck_id and d.user_id = auth.uid())
  );

create policy "review_logs: hammasi" on public.review_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7) "Bu email ro'yxatdan o'tganmi?" tekshiruvi (Login sahifasi uchun) ------
-- Diqqat: bu email mavjudligini oshkor qiladi. Xohlamasangiz, shu funksiyani
-- o'chiring va Login'da faqat "Email yoki parol noto'g'ri" xabarini ko'rsating.
create or replace function public.email_exists(p_email text)
returns boolean
language sql
stable
security definer set search_path = public, auth
as $$
  select exists (select 1 from auth.users where lower(email) = lower(p_email));
$$;
revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to anon, authenticated;
