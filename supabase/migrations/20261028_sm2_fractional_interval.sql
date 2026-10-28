-- SM-2: takrorlash oralig'i kasrli kun bo'lishi mumkin (1 -> 2.5 -> 6.25 -> 15.625 ...)
-- Supabase -> SQL Editor -> New query -> shu faylni to'liq joylab Run.
-- Mavjud butun qiymatlar o'zgarishsiz saqlanadi (3 -> 3.0).
alter table public.cards
  alter column interval_days type double precision using interval_days::double precision,
  alter column interval_days set default 0;
