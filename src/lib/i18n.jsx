import { createContext, useContext, useEffect, useState } from "react";
import { load, save } from "./storage";
import en from "../locales/en";
import ru from "../locales/ru";
import uz from "../locales/uz";

export const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "ru", label: "Русский" },
  { id: "uz", label: "O'zbekcha" },
];

const LANG_KEY = "lang";
const dict = { en, ru, uz };

// t("deck.terms", { count: 3 }) → "deck.terms_one" / "_few" / "_many" / "_other"
// va matndagi {count}, {name} kabi joylar qiymat bilan almashtiriladi
export function translate(lang, key, vars) {
  let k = key;
  if (vars && typeof vars.count === "number") {
    const form = new Intl.PluralRules(lang).select(vars.count);
    const pick = (d) => d[`${key}_${form}`] ?? d[`${key}_other`];
    const text = pick(dict[lang]) ?? pick(dict.en);
    if (text !== undefined) return fill(text, vars);
  }
  const text = dict[lang][k] ?? dict.en[k] ?? k;
  return vars ? fill(text, vars) : text;
}

const fill = (text, vars) =>
  text.replace(/\{(\w+)\}/g, (m, name) =>
    vars[name] !== undefined ? String(vars[name]) : m,
  );

// Ba'zi brauzerlarda Intl o'zbekcha oy va kun nomlarini bilmaydi ("M01"), shuning uchun qo'lda
const UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const UZ_WEEKDAYS = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];

export const monthNames = (lang) =>
  lang === "uz"
    ? UZ_MONTHS.map((m) => m[0].toUpperCase() + m.slice(1))
    : Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat(lang, { month: "long" }).format(new Date(2000, i, 1)),
      );

export const weekdayShort = (lang, date) =>
  lang === "uz"
    ? UZ_WEEKDAYS[date.getDay()]
    : new Intl.DateTimeFormat(lang, { weekday: "short" }).format(date);

// "5 March 2024" / "5 марта 2024 г." / "2024-yil 5-mart"
export const formatDate = (lang, date) =>
  lang === "uz"
    ? `${date.getFullYear()}-yil ${date.getDate()}-${UZ_MONTHS[date.getMonth()]}`
    : date.toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" });

const LangContext = createContext({
  lang: "en",
  setLang: () => {},
  t: (k, v) => translate("en", k, v),
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = load(LANG_KEY, "en");
    return dict[saved] ? saved : "en";
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l) => {
    setLangState(l);
    save(LANG_KEY, l);
  };

  const t = (key, vars) => translate(lang, key, vars);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
