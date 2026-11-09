import { supabase } from "./supabase";
import { dayKey, WEEKDAYS } from "./utils";
import { LEARN_AGAIN_WINDOW } from "./srs";
import { whereDeck } from "./decks";

const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// ---- DB qatori <-> SRS obyekti --------------------------------------
// Oddiy Anki "srs_state, ease, ..." ustunlarida, Translation Anki esa "uz_" bilan
// boshlanadigan alohida ustunlarda saqlanadi: ikkalasining holati va limiti mustaqil
const pre = (meaning) => (meaning === "uzbek" ? "uz_" : "");

export const srsFromRow = (r, meaning) => {
  const p = pre(meaning);
  return {
    state: r[`${p}srs_state`],
    ease: r[`${p}ease`],
    interval: r[`${p}interval_days`],
    due: new Date(r[`${p}due`]).getTime(),
    reps: r[`${p}reps`],
    lapses: r[`${p}lapses`],
    step: r[`${p}learn_step`] ?? 0,
  };
};

const srsToRow = (s, meaning) => {
  const p = pre(meaning);
  return {
    [`${p}srs_state`]: s.state,
    [`${p}ease`]: s.ease,
    [`${p}interval_days`]: s.interval,
    [`${p}due`]: new Date(s.due).toISOString(),
    [`${p}reps`]: s.reps,
    [`${p}lapses`]: s.lapses,
    [`${p}learn_step`]: s.step ?? 0,
  };
};

// ---- Decklar -----------------------------------------------------------
export async function getDecksWithStats() {
  const [decks, stats] = await Promise.all([
    supabase
      .from("decks")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .then(must),
    supabase.from("deck_stats").select("*").then(must),
  ]);
  const byId = Object.fromEntries(stats.map((s) => [s.deck_id, s]));
  return decks.map((d) => ({
    ...d,
    total: byId[d.id]?.total ?? 0,
    newCount: byId[d.id]?.new_count ?? 0,
    learnCount: byId[d.id]?.learn_count ?? 0,
    dueCount: byId[d.id]?.due_count ?? 0,
  }));
}

export const createDeck = (name, description = "", folderId = null) =>
  supabase
    .from("decks")
    .insert({
      name: name.trim(),
      description: description.trim(),
      folder_id: folderId,
    })
    .select()
    .single()
    .then(must);

export const renameDeck = (id, name) =>
  supabase.from("decks").update({ name: name.trim() }).eq("id", id).then(must);

export const deleteDeck = (id) =>
  supabase.from("decks").delete().eq("id", id).then(must);

export const getDeck = (id) =>
  supabase.from("decks").select("*").eq("id", id).single().then(must);

export const updateDeck = (id, fields) =>
  supabase
    .from("decks")
    .update({
      name: fields.name.trim(),
      description: (fields.description || "").trim(),
    })
    .eq("id", id)
    .select()
    .single()
    .then(must);

// ---- Kartalar ----------------------------------------------------------
// deckId: bitta deck yoki vergul bilan bir nechta (lib/decks.js)
export const getCards = (deckId) =>
  whereDeck(supabase.from("cards").select("*"), deckId)
    .order("deck_id", { ascending: true })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .then(must);

// position: hozirgi vaqt + tartib raqami, shunda yangi kartalar oxiriga,
// bir partiyadagilar esa berilgan tartibda tushadi
export const addCards = (deckId, cards) => {
  const base = Date.now() / 1000;
  return supabase
    .from("cards")
    .insert(
      cards.map((c, i) => ({
        deck_id: deckId,
        term: c.term.trim(),
        definition: (c.definition || "").trim(),
        translation: (c.translation || "").trim(),
        example: (c.example || "").trim(),
        term_image: c.term_image || null,
        definition_image: c.definition_image || null,
        position: base + i / 1000,
      })),
    )
    .select()
    .then(must);
};

export const updateCard = (id, f) =>
  supabase
    .from("cards")
    .update({
      term: f.term.trim(),
      definition: (f.definition || "").trim(),
      translation: (f.translation || "").trim(),
      example: (f.example || "").trim(),
      // Rasmlar faqat berilgan bo'lsa yangilanadi
      ...("term_image" in f && { term_image: f.term_image || null }),
      ...("definition_image" in f && { definition_image: f.definition_image || null }),
    })
    .eq("id", id)
    .select()
    .single()
    .then(must);

// Tahrirda kartalar tartibi o'zgarsa
export const setCardPosition = (id, position) =>
  supabase.from("cards").update({ position }).eq("id", id).then(must);

export const deleteCard = (id) =>
  supabase.from("cards").delete().eq("id", id).then(must);

// ---- Takrorlash ----------------------------------------------------------
// meaning: "definition" — oddiy Anki, "uzbek" — Translation Anki (alohida jadval va limit).
// keep: kartani shu rejimda o'qish mumkinmi (masalan, o'zbekcha tarjimasi bormi)

// Bugun yana nechta YANGI karta o'rganish mumkin (kunlik limit - bugun ko'rilgan yangilar)
export async function getNewLeft(meaning = "definition") {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [profile, logs] = await Promise.all([
    supabase.from("profiles").select("new_per_day").maybeSingle().then(must),
    supabase
      .from("review_logs")
      .select("id", { count: "exact", head: true })
      .eq("was_new", true)
      .eq("meaning", meaning)
      .gte("reviewed_at", start.toISOString()),
  ]);
  if (logs.error) throw logs.error;
  return Math.max(0, (profile?.new_per_day ?? 20) - (logs.count ?? 0));
}

const always = () => true;

// deckId: 'all' yoki deck id.
// extraNew: kunlik limit tugagan bo'lsa ham shuncha yangi kartani qo'shib beradi ("Hozir o'qish")
export async function getStudyQueue(
  deckId,
  { extraNew = 0, meaning = "definition", keep = always } = {},
) {
  const p = pre(meaning);
  const left = extraNew || (await getNewLeft(meaning));
  // Daqiqalik qadamdagi kartalar vaqti biroz oldinroq bo'lsa ham olinadi (Anki'dagi "learn ahead"),
  // shunda sahifa qayta ochilganda ular navbatdan yo'qolib qolmaydi
  let dueQ = supabase
    .from("cards")
    .select("*")
    .neq(`${p}srs_state`, "new")
    .lte(`${p}due`, new Date(Date.now() + LEARN_AGAIN_WINDOW).toISOString())
    .order(`${p}due`, { ascending: true })
    .limit(200);
  // keep bilan saralanadigan bo'lsa limitni keyin qo'yamiz (tarjimasiz kartalar limitni yemasin)
  let newQ = supabase
    .from("cards")
    .select("*")
    .eq(`${p}srs_state`, "new")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(keep === always ? left : 2000);
  dueQ = whereDeck(dueQ, deckId);
  newQ = whereDeck(newQ, deckId);
  const [due, fresh] = await Promise.all([
    dueQ.then(must),
    left > 0 ? newQ.then(must) : Promise.resolve([]),
  ]);
  return [...due.filter(keep), ...fresh.filter(keep).slice(0, left)].map((card) => ({
    card,
    srs: srsFromRow(card, meaning),
  }));
}

// Deckdagi (yoki hamma decklardagi) hali o'rganilmagan yangi kartalar soni
export async function countNewCards(deckId, { meaning = "definition", keep } = {}) {
  const p = pre(meaning);
  if (keep) {
    let q = supabase
      .from("cards")
      .select("id, definition, translation")
      .eq(`${p}srs_state`, "new")
      .limit(5000);
    q = whereDeck(q, deckId);
    return (await q.then(must)).filter(keep).length;
  }
  let q = supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq(`${p}srs_state`, "new");
  q = whereDeck(q, deckId);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function gradeCard({ card, srs, rating, wasNew, meaning = "definition" }) {
  const results = await Promise.all([
    supabase.from("cards").update(srsToRow(srs, meaning)).eq("id", card.id),
    supabase.from("review_logs").insert({
      card_id: card.id,
      deck_id: card.deck_id,
      rating,
      was_new: wasNew,
      meaning,
    }),
    supabase
      .from("decks")
      .update({ last_studied_at: new Date().toISOString() })
      .eq("id", card.deck_id),
  ]);
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
}

// Match / Test / Writing uchun: javobni tarixga yozadi (SRS jadvalini o'zgartirmaydi).
// Haqiqiy Promise qaytaradi: Supabase so'rov obyektida .catch yo'q, chaqiruvchilar esa
// logPractice(...).catch(...) deb ishlatadi
export const logPractice = (deckId, cardId, correct) =>
  supabase
    .from("review_logs")
    .insert({
      card_id: cardId,
      deck_id: deckId,
      rating: correct ? 2 : 0,
      was_new: false,
    })
    .then(must);

// ---- Papkalar ----------------------------------------------------------
export async function getFolders() {
  const [folders, decks] = await Promise.all([
    supabase
      .from("folders")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .then(must),
    supabase.from("decks").select("id, folder_id").then(must),
  ]);
  const counts = {};
  decks.forEach((d) => {
    if (d.folder_id) counts[d.folder_id] = (counts[d.folder_id] || 0) + 1;
  });
  return folders.map((f) => ({ ...f, deckCount: counts[f.id] || 0 }));
}

export const getFolder = (id) =>
  supabase.from("folders").select("*").eq("id", id).single().then(must);

export const createFolder = (name, description = "") =>
  supabase
    .from("folders")
    .insert({ name: name.trim(), description: description.trim() })
    .select()
    .single()
    .then(must);

export const renameFolder = (id, name) =>
  supabase
    .from("folders")
    .update({ name: name.trim() })
    .eq("id", id)
    .then(must);

export const deleteFolder = (id) =>
  supabase.from("folders").delete().eq("id", id).then(must);

// Papkaga qo'shish yoki undan chiqarish
export const setDeckFolder = (deckId, folderId) =>
  supabase
    .from("decks")
    .update({ folder_id: folderId })
    .eq("id", deckId)
    .then(must);

export const setFolderPinned = (id, pinned) =>
  supabase.from("folders").update({ pinned }).eq("id", id).then(must);

export const setDeckPinned = (id, pinned) =>
  supabase.from("decks").update({ pinned }).eq("id", id).then(must);

// ---- Home sahifa ---------------------------------------------------------
export async function getHomeData() {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  since.setHours(0, 0, 0, 0);

  const [decks, newLeft, folders, logs] = await Promise.all([
    getDecksWithStats(),
    getNewLeft(),
    getFolders(),
    supabase
      .from("review_logs")
      .select("reviewed_at")
      .gte("reviewed_at", since.toISOString())
      .order("reviewed_at", { ascending: false })
      .limit(1000)
      .then(must),
  ]);

  const dueTotal = decks.reduce((s, d) => s + d.dueCount, 0);
  const learnTotal = decks.reduce((s, d) => s + d.learnCount, 0);
  const newTotal = decks.reduce((s, d) => s + d.newCount, 0);
  const todayCount = dueTotal + learnTotal + Math.min(newLeft, newTotal);

  const studied = decks
    .filter((d) => d.last_studied_at)
    .sort((a, b) => new Date(b.last_studied_at) - new Date(a.last_studied_at));
  const recentDecks = (studied.length ? studied : decks).slice(0, 4);

  const perDay = {};
  logs.forEach((l) => {
    const k = dayKey(new Date(l.reviewed_at));
    perDay[k] = (perDay[k] || 0) + 1;
  });
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: WEEKDAYS[d.getDay()],
      date: d,
      count: perDay[dayKey(d)] || 0,
    });
  }
  let streak = 0;
  const cursor = new Date();
  if (!perDay[dayKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
  while (perDay[dayKey(cursor)]) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    todayCount,
    recentDecks,
    recentFolders: folders.slice(0, 4),
    days,
    streak,
    hasDecks: decks.length > 0,
  };
}

// ---- Profil ----------------------------------------------------------
export const getProfile = () =>
  supabase.from("profiles").select("*").single().then(must);

export async function updateNewPerDay(n) {
  const { data: auth } = await supabase.auth.getUser();
  const res = await supabase
    .from("profiles")
    .update({ new_per_day: n })
    .eq("id", auth.user.id);
  if (res.error) throw res.error;
}

export async function uploadAvatar(file) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user.id;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${uid}/avatar-${Date.now()}.${ext}`;

  const up = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (up.error) throw up.error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = data.publicUrl;
  const saved = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", uid);
  if (saved.error) throw saved.error;

  // Eski rasmlarni tozalaymiz
  const old = await supabase.storage.from("avatars").list(uid);
  if (!old.error) {
    const stale = old.data
      .filter((f) => `${uid}/${f.name}` !== path)
      .map((f) => `${uid}/${f.name}`);
    if (stale.length) await supabase.storage.from("avatars").remove(stale);
  }
  return url;
}

export async function removeAvatar() {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user.id;
  const listed = await supabase.storage.from("avatars").list(uid);
  if (!listed.error && listed.data.length) {
    await supabase.storage
      .from("avatars")
      .remove(listed.data.map((f) => `${uid}/${f.name}`));
  }
  const saved = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", uid);
  if (saved.error) throw saved.error;
}

// Akkauntni o'chirish: SQL'dagi delete_account() funksiyasi bajaradi
export const deleteAccount = () => supabase.rpc("delete_account").then(must);
// ---- Karta rasmlari va rasmdan import ------------------------------------
// Rasmni kichraytirib JPEG qiladi: yuklash tez, AI uchun ham arzonroq
export async function shrinkImage(file, maxSide = 1600, quality = 0.85) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not read the image"))),
      "image/jpeg",
      quality,
    ),
  );
}

export async function uploadCardImage(file) {
  const { data: auth } = await supabase.auth.getUser();
  const blob = await shrinkImage(file, 1200);
  const path = `${auth.user.id}/${crypto.randomUUID()}.jpg`;
  const up = await supabase.storage
    .from("card-images")
    .upload(path, blob, { contentType: "image/jpeg" });
  if (up.error) throw up.error;
  return supabase.storage.from("card-images").getPublicUrl(path).data.publicUrl;
}

const toBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

// Rasmdagi so'zlarni "extract-words" Edge Function (Claude) orqali ajratib oladi.
// Natija: [{ term, definition }]
export async function extractWordsFromPhoto(file) {
  const blob = await shrinkImage(file, 1600);
  const { data, error } = await supabase.functions.invoke("extract-words", {
    body: { image: await toBase64(blob), mediaType: "image/jpeg" },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.cards ?? [];
}

// Navbardagi tarjimon: from — "en" yoki "uz"
export async function translateWord(text, from) {
  const { data, error } = await supabase.functions.invoke("translate-word", {
    body: { text, from },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Papka ichidagi barcha decklarning kartalari (papka imtihoni uchun)
export async function getFolderCards(folderId) {
  const decks = await supabase
    .from("decks")
    .select("id")
    .eq("folder_id", folderId)
    .then(must);
  if (!decks.length) return [];
  return supabase
    .from("cards")
    .select("*")
    .in(
      "deck_id",
      decks.map((d) => d.id),
    )
    .then(must);
}
