-- Kartalarga rasm va tartib qo'shish (Create deck: ikki tomonga rasm, so'zlarni surish)
-- Supabase -> SQL Editor -> New query -> shu faylni to'liq joylab Run.

-- 1) Kartalar: har ikki tomon uchun rasm va tartib raqami ---------------------
alter table public.cards
  add column if not exists term_image       text,
  add column if not exists definition_image text,
  -- Yangi kartalar oxiriga tushishi uchun standart qiymat — hozirgi vaqt (soniyalarda).
  -- Mavjud kartalar bir xil qiymat oladi, ular created_at bo'yicha tartiblanadi.
  add column if not exists position double precision not null
    default extract(epoch from clock_timestamp());

create index if not exists cards_deck_position_idx
  on public.cards (deck_id, position, created_at);

-- 2) Rasmlar uchun ochiq bucket: har kim o'qiy oladi, faqat egasi yozadi ------
insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict (id) do nothing;

-- Fayl yo'li: <user_id>/<fayl>. Foydalanuvchi faqat o'z papkasiga yozadi va o'chiradi.
create policy "card-images: yuklash" on storage.objects for insert to authenticated
  with check (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "card-images: yangilash" on storage.objects for update to authenticated
  using (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "card-images: o'chirish" on storage.objects for delete to authenticated
  using (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);
