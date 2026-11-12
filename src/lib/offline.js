// Oflayn rejim.
// 1) Internet bor paytda decklar, papkalar, kartalar, profil va oxirgi 30 kunlik tarix
//    qurilmaga (IndexedDB) saqlanadi — "snapshot".
// 2) Internet yo'q bo'lsa o'qish so'rovlari shu snapshotdan javob beradi.
// 3) Oflayn paytdagi javoblar (Anki baholari, mashq natijalari) navbatga yoziladi va
//    internet qaytganda Supabase'ga yuboriladi.
import { supabase } from "./supabase";

const DB_NAME = "voc-offline";
const STORE = "kv";

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}
async function idb(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}
const idbGet = (key) => idb("readonly", (s) => s.get(key)).catch(() => undefined);
const idbSet = (key, val) => idb("readwrite", (s) => s.put(val, key)).catch(() => {});
const idbDel = (key) => idb("readwrite", (s) => s.delete(key)).catch(() => {});

// ---- Holat va obunachilar (banner uchun) --------------------------------
const listeners = new Set();
const state = { pending: 0, syncing: false, savedAt: null };
const emit = () => listeners.forEach((fn) => fn({ ...state }));
export function subscribeOffline(fn) {
  listeners.add(fn);
  fn({ ...state });
  return () => listeners.delete(fn);
}

// Internet yo'qligi yoki so'rov tarmoq sababli o'xshamaganmi
export const isNetworkError = (e) =>
  !navigator.onLine ||
  /failed to fetch|load failed|networkerror|network request failed|fetch failed/i.test(
    String(e?.message ?? e ?? ""),
  );

// ---- Snapshot ------------------------------------------------------------
let snap;
export async function getSnapshot() {
  if (snap === undefined) {
    snap = (await idbGet("snapshot")) ?? null;
    state.savedAt = snap?.savedAt ?? null;
  }
  return snap;
}
async function saveSnapshot(next) {
  snap = next;
  state.savedAt = next?.savedAt ?? null;
  emit();
  await idbSet("snapshot", next);
}

const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// Ko'p kartali foydalanuvchi uchun 1000 talab sahifalab olamiz
async function allRows(table, columns = "*") {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const rows = await supabase
      .from(table)
      .select(columns)
      .range(from, from + 999)
      .then(must);
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

let refreshing = null;
export function refreshSnapshot() {
  if (!navigator.onLine) return Promise.resolve(null);
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return null;
      const since = new Date();
      since.setDate(since.getDate() - 30);
      since.setHours(0, 0, 0, 0);
      const [decks, folders, cards, profile, logs] = await Promise.all([
        allRows("decks"),
        allRows("folders"),
        allRows("cards"),
        supabase.from("profiles").select("*").maybeSingle().then(must),
        supabase
          .from("review_logs")
          .select("reviewed_at, was_new, meaning")
          .gte("reviewed_at", since.toISOString())
          .order("reviewed_at", { ascending: false })
          .limit(5000)
          .then(must),
      ]);
      const next = { userId, decks, folders, cards, profile, logs, savedAt: Date.now() };
      await saveSnapshot(next);
      return next;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

// Snapshotdagi bitta kartani yangilash (Anki bahosidan keyin) va tarixga yozuv qo'shish
export async function patchSnapshot({ cardId, cardPatch, deckId, log }) {
  const s = await getSnapshot();
  if (!s) return;
  const now = new Date().toISOString();
  await saveSnapshot({
    ...s,
    cards: cardPatch
      ? s.cards.map((c) => (c.id === cardId ? { ...c, ...cardPatch } : c))
      : s.cards,
    decks: deckId
      ? s.decks.map((d) => (d.id === deckId ? { ...d, last_studied_at: now } : d))
      : s.decks,
    logs: log ? [{ reviewed_at: now, was_new: false, meaning: "definition", ...log }, ...s.logs] : s.logs,
  });
}

// ---- Navbat ----------------------------------------------------------------
async function getQueue() {
  return (await idbGet("queue")) ?? [];
}
async function setQueue(q) {
  state.pending = q.length;
  emit();
  await idbSet("queue", q);
}
export async function enqueue(op) {
  const q = await getQueue();
  await setQueue([...q, { ...op, at: new Date().toISOString() }]);
}

// Bitta amalni Supabase'ga yuborish
async function run(op) {
  const log = { ...op.log, reviewed_at: op.at };
  if (op.kind === "grade") {
    const results = await Promise.all([
      supabase.from("cards").update(op.cardPatch).eq("id", op.cardId),
      supabase.from("review_logs").insert(log),
      supabase.from("decks").update({ last_studied_at: op.at }).eq("id", op.deckId),
    ]);
    const failed = results.find((r) => r.error);
    if (failed) throw failed.error;
  } else if (op.kind === "log") {
    await supabase.from("review_logs").insert(log).then(must);
  }
}

let flushing = null;
export function flushQueue() {
  if (flushing) return flushing;
  flushing = (async () => {
    let q = await getQueue();
    state.pending = q.length;
    if (!q.length || !navigator.onLine) return emit();
    state.syncing = true;
    emit();
    try {
      while (q.length) {
        try {
          await run(q[0]);
        } catch (e) {
          // Tarmoq yo'q — keyinroq yana urinib ko'ramiz. Boshqa xato (masalan karta
          // o'chirilgan) bo'lsa, shu amalni tashlab ketamiz, navbat tiqilib qolmasin
          if (isNetworkError(e)) break;
        }
        q = q.slice(1);
        await setQueue(q);
      }
      if (!q.length) await refreshSnapshot();
    } finally {
      state.syncing = false;
      emit();
      flushing = null;
    }
  })();
  return flushing;
}

// Ilova ochilganda va internet qaytganda: avval navbat, keyin yangi snapshot
export function startOfflineSync(userId) {
  const sync = () => flushQueue().then(() => refreshSnapshot());
  // Boshqa foydalanuvchining eski nusxasi qolib ketgan bo'lsa ishlatmaymiz
  getSnapshot().then(async (s) => {
    if (s && s.userId !== userId) await clearOffline();
    const q = await getQueue();
    state.pending = q.length;
    emit();
    sync();
  });
  // Ilovaga qaytilganda nusxa eski bo'lsa (masalan boshqa qurilmada o'zgartirilgan) yangilaymiz
  const onVisible = () => {
    if (document.visibilityState === "visible" && Date.now() - (state.savedAt ?? 0) > 2 * 60 * 1000)
      sync();
  };
  window.addEventListener("online", sync);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.removeEventListener("online", sync);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

// Chiqishda boshqa foydalanuvchi ma'lumoti qolmasin
export async function clearOffline() {
  snap = null;
  state.pending = 0;
  state.savedAt = null;
  emit();
  await Promise.all([idbDel("snapshot"), idbDel("queue")]);
}

// Onlayn so'rov; tarmoq bo'lmasa — snapshotdan javob
export function withOffline(online, offline) {
  return async (...args) => {
    if (navigator.onLine) {
      try {
        return await online(...args);
      } catch (e) {
        if (!isNetworkError(e)) throw e;
      }
    }
    const s = await getSnapshot();
    if (!s) throw new Error(OFFLINE_EMPTY);
    return offline(s, ...args);
  };
}
export const OFFLINE_EMPTY = "offline-empty";
