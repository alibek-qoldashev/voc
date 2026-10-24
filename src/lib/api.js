import { supabase } from "./supabase";
import { dayKey, WEEKDAYS } from "./utils";

const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// ---- DB qatori <-> SRS obyekti --------------------------------------
export const srsFromRow = (r) => ({
  state: r.srs_state,
  ease: r.ease,
  interval: r.interval_days,
  due: new Date(r.due).getTime(),
  reps: r.reps,
  lapses: r.lapses,
  step: r.learn_step ?? 0,
});

const srsToRow = (s) => ({
  srs_state: s.state,
  ease: s.ease,
  interval_days: s.interval,
  due: new Date(s.due).toISOString(),
  reps: s.reps,
  lapses: s.lapses,
  learn_step: s.step ?? 0,
});

// ---- Decklar -----------------------------------------------------------
export async function getDecksWithStats() {
  const [decks, stats] = await Promise.all([
    supabase
      .from("decks")
      .select("*")
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
export const getCards = (deckId) =>
  supabase
    .from("cards")
    .select("*")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: true })
    .then(must);

export const addCards = (deckId, cards) =>
  supabase
    .from("cards")
    .insert(
      cards.map((c) => ({
        deck_id: deckId,
        term: c.term.trim(),
        definition: (c.definition || "").trim(),
        translation: (c.translation || "").trim(),
        example: (c.example || "").trim(),
      })),
    )
    .select()
    .then(must);

export const updateCard = (id, f) =>
  supabase
    .from("cards")
    .update({
      term: f.term.trim(),
      definition: (f.definition || "").trim(),
      translation: (f.translation || "").trim(),
      example: (f.example || "").trim(),
    })
    .eq("id", id)
    .select()
    .single()
    .then(must);

export const deleteCard = (id) =>
  supabase.from("cards").delete().eq("id", id).then(must);

// ---- Takrorlash ----------------------------------------------------------
// Bugun yana nechta YANGI karta o'rganish mumkin (kunlik limit - bugun ko'rilgan yangilar)
export async function getNewLeft() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [profile, logs] = await Promise.all([
    supabase.from("profiles").select("new_per_day").maybeSingle().then(must),
    supabase
      .from("review_logs")
      .select("id", { count: "exact", head: true })
      .eq("was_new", true)
      .gte("reviewed_at", start.toISOString()),
  ]);
  if (logs.error) throw logs.error;
  return Math.max(0, (profile?.new_per_day ?? 20) - (logs.count ?? 0));
}

// deckId: 'all' yoki deck id
export async function getStudyQueue(deckId) {
  const left = await getNewLeft();
  let dueQ = supabase
    .from("cards")
    .select("*")
    .neq("srs_state", "new")
    .lte("due", new Date().toISOString())
    .order("due", { ascending: true })
    .limit(200);
  let newQ = supabase
    .from("cards")
    .select("*")
    .eq("srs_state", "new")
    .order("created_at", { ascending: true })
    .limit(left);
  if (deckId !== "all") {
    dueQ = dueQ.eq("deck_id", deckId);
    newQ = newQ.eq("deck_id", deckId);
  }
  const [due, fresh] = await Promise.all([
    dueQ.then(must),
    left > 0 ? newQ.then(must) : Promise.resolve([]),
  ]);
  return [...due, ...fresh].map((card) => ({ card, srs: srsFromRow(card) }));
}

export async function gradeCard({ card, srs, rating, wasNew }) {
  const results = await Promise.all([
    supabase.from("cards").update(srsToRow(srs)).eq("id", card.id),
    supabase.from("review_logs").insert({
      card_id: card.id,
      deck_id: card.deck_id,
      rating,
      was_new: wasNew,
    }),
    supabase
      .from("decks")
      .update({ last_studied_at: new Date().toISOString() })
      .eq("id", card.deck_id),
  ]);
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
}

// Match / Test / Writing uchun: javobni tarixga yozadi (SRS jadvalini o'zgartirmaydi)
export const logPractice = (deckId, cardId, correct) =>
  supabase.from("review_logs").insert({
    card_id: cardId,
    deck_id: deckId,
    rating: correct ? 2 : 0,
    was_new: false,
  });

// ---- Home sahifa ---------------------------------------------------------
export async function getHomeData() {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  since.setHours(0, 0, 0, 0);

  const [decks, newLeft, words, logs] = await Promise.all([
    getDecksWithStats(),
    getNewLeft(),
    supabase
      .from("review_logs")
      .select("id, rating, reviewed_at, cards(term, translation)")
      .order("reviewed_at", { ascending: false })
      .limit(8)
      .then(must),
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
    days.push({ label: WEEKDAYS[d.getDay()], count: perDay[dayKey(d)] || 0 });
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
    words,
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

// ---- Papkalar ----------------------------------------------------------
export async function getFolders() {
  const [folders, decks] = await Promise.all([
    supabase
      .from("folders")
      .select("*")
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
