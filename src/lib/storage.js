// Brauzer xotirasi bo'lmasa ham sahifa ishlashi kerak
export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* xotira yopiq */
  }
}

// Deck sahifasidagi "orqaga" havolasi: deck papka ichidan ochilgan bo'lsa papkaga qaytadi.
// Papka sahifasi o'zini yozib qo'yadi, Flashcards va Home sahifalari tozalaydi.
// O'quv rejimidan deckka qaytganda ham saqlanib qoladi (shu tab yopilguncha)
const DECK_ORIGIN_KEY = "deck-origin";
export function setDeckOrigin(folder) {
  try {
    if (folder) sessionStorage.setItem(DECK_ORIGIN_KEY, JSON.stringify(folder));
    else sessionStorage.removeItem(DECK_ORIGIN_KEY);
  } catch {
    /* xotira yopiq */
  }
}
export function getDeckOrigin() {
  try {
    return JSON.parse(sessionStorage.getItem(DECK_ORIGIN_KEY)) || null;
  } catch {
    return null;
  }
}
