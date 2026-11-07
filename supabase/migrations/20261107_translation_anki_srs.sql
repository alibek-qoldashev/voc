-- Translation rejimidagi Anki uchun alohida takrorlash jadvali.
-- Oddiy Anki (inglizcha ta'rif) va Translation Anki (o'zbekcha tarjima) bir-biriga ta'sir qilmaydi:
-- har birining o'z holati, oralig'i va kunlik yangi so'z limiti bor.
alter table public.cards
  add column if not exists uz_srs_state     text not null default 'new'
    check (uz_srs_state in ('new', 'learning', 'review')),
  add column if not exists uz_ease          real not null default 2.5,
  add column if not exists uz_interval_days double precision not null default 0,
  add column if not exists uz_due           timestamptz not null default now(),
  add column if not exists uz_reps          int not null default 0,
  add column if not exists uz_lapses        int not null default 0,
  add column if not exists uz_learn_step    int not null default 0;

create index if not exists cards_user_uz_due_idx on public.cards (user_id, uz_srs_state, uz_due);

-- Qaysi Anki'da ko'rilgani: 'definition' (oddiy) yoki 'uzbek' (Translation)
alter table public.review_logs
  add column if not exists meaning text not null default 'definition'
    check (meaning in ('definition', 'uzbek'));
