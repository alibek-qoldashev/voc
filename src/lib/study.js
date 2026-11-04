import { useOutletContext } from "react-router-dom";
import { shuffle, speak } from "./utils";
import { load } from "./storage";

export const STUDY_SETTINGS_KEY = "study-settings";

// Learn rejimidagi savol turlari, o'tish tartibida (nomi tarjimada: qtype.<id>):
// avval test, to'g'ri topilgan so'z keyin yozma savol bo'lib qaytadi
export const QUESTION_TYPES = [{ id: "choice" }, { id: "write" }];

export const STUDY_DEFAULTS = {
  shuffle: true,
  starredOnly: false,
  tts: false,
  types: { choice: true, write: true },
  // Test: savolda nima beriladi ("definition" — ta'rif, variantlar so'zlar; "term" — aksincha)
  testAsk: "definition",
};

export const TEST_SIDES = ["term", "definition"];

export function loadStudySettings() {
  const saved = load(STUDY_SETTINGS_KEY, {});
  return {
    ...STUDY_DEFAULTS,
    ...saved,
    types: { ...STUDY_DEFAULTS.types, ...saved.types },
  };
}

// FlipBoard bilan bir xil kalit: deck boardida qo'yilgan yulduzchalar
export const loadStarred = (deckId) => new Set(load(`starred:${deckId}`, []));

// O'quv sahifalari tepa paneldagi sozlamalarni shu orqali oladi
export function useStudy() {
  const ctx = useOutletContext();
  const settings = ctx?.settings ?? STUDY_DEFAULTS;
  const starred = ctx?.starred ?? new Set();
  return {
    settings,
    update: ctx?.update ?? (() => {}),
    // Test boshida yo'nalish tanlandimi (sozlamadan o'zgartirilganda qayta so'ralmaydi)
    testPicked: ctx?.testPicked ?? true,
    setTestPicked: ctx?.setTestPicked ?? (() => {}),
    // "Tarjima" rejimi orqali kirilgan bo'lsa (?m=uz) so'z o'zbekcha tarjimasi bilan so'raladi
    meaning: ctx?.meaning ?? "definition",
    // Faqat yulduzchali so'zlar yoqilgan bo'lsa, qolganlarini olib tashlaydi
    filter: (items, idOf = (c) => c.id) =>
      settings.starredOnly ? items.filter((i) => starred.has(idOf(i))) : items,
    order: (items) => (settings.shuffle ? shuffle(items) : items),
    say: (text) => settings.tts && text && speak(text),
  };
}
