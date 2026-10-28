// SM-2 oraliqli takrorlash.
// Har karta uchun: EF (osonlik koeffitsiyenti), I (oraliq, kun), q (javob sifati).
//   Birinchi muvaffaqiyatli takrorlash: I = 1 kun
//   Keyingilari:                        I_n = I_{n-1} * EF
//   EF yangilanishi:                    EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)), kamida 1.3
//   q < 3 (Again):                      karta qaytadan boshlanadi, sessiya ichida yana ko'rsatiladi
// Masalan EF = 2.5 va har safar Good: 1 -> 2.5 -> 6.25 -> 15.625 -> 39.06 kun.
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

export const START_EF = 2.5;
const MIN_EF = 1.3;
const FIRST_INTERVAL = 1; // kun
// "Again" bosilgan karta shu vaqtdan keyin sessiyada yana chiqadi
const RETRY_DELAY = 1 * MIN;

// Tugmalar va ularning SM-2 sifat bahosi (q, 0–5 shkala)
export const RATINGS = [
  { id: 0, label: "Again", key: "1", q: 1 },
  { id: 1, label: "Hard", key: "2", q: 3 },
  { id: 2, label: "Good", key: "3", q: 4 },
  { id: 3, label: "Easy", key: "4", q: 5 },
];

export const nextEase = (ef, q) =>
  Math.max(MIN_EF, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

export function schedule(srs, rating, now = Date.now()) {
  const { q } = RATINGS[rating];
  const ef = srs.ease || START_EF;
  const ease = nextEase(ef, q);
  const reps = (srs.reps || 0) + 1;

  if (q < 3) {
    // Unutildi: takrorlashlar qatori uziladi, keyingi muvaffaqiyatda yana 1 kundan boshlanadi
    return {
      state: "learning",
      ease,
      interval: 0,
      reps,
      lapses: (srs.lapses || 0) + (srs.state === "review" ? 1 : 0),
      step: 0,
      due: now + RETRY_DELAY,
    };
  }

  // Avval muvaffaqiyatli takrorlangan bo'lsa I_n = I_{n-1} * EF, aks holda boshlang'ich 1 kun.
  // Yangilangan EF ishlatiladi: Good'da EF o'zgarmaydi (jadvaldagidek), Hard qisqaroq, Easy uzunroq oraliq beradi.
  const interval =
    srs.state === "review" && srs.interval > 0
      ? srs.interval * ease
      : FIRST_INTERVAL;

  return {
    state: "review",
    ease,
    interval,
    reps,
    lapses: srs.lapses || 0,
    step: 0,
    due: now + interval * DAY,
  };
}

// t — tarjima funksiyasi (i18n): "unit.min" va h.k. kalitlar
export function fmtInterval(ms, t = (k, v) => `${v.n} ${k.slice(5)}`) {
  const min = Math.round(ms / MIN);
  if (min < 1) return `<${t("unit.min", { n: 1 })}`;
  if (min < 60) return t("unit.min", { n: min });
  const h = Math.round(min / 60);
  if (h < 24) return t("unit.h", { n: h });
  // 30 kundan kam oraliqlar o'nli kasr bilan (2.5 kun, 15.6 kun), aks holda tugmalar bir xil ko'rinadi
  const days = ms / DAY;
  if (days < 30) return t("unit.d", { n: Number(days.toFixed(1)) });
  const d = Math.round(days);
  if (d < 365) return t("unit.mo", { n: Math.round(d / 30) });
  return t("unit.y", { n: (d / 365).toFixed(1) });
}

export const previewLabels = (srs, t, now = Date.now()) =>
  RATINGS.map((r) => fmtInterval(schedule(srs, r.id, now).due - now, t));

// Shu oyna ichida qaytadigan karta sessiya navbatiga qaytariladi
export const LEARN_AGAIN_WINDOW = 20 * MIN;
