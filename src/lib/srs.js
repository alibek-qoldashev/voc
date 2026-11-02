// Anki uslubidagi oraliqli takrorlash (SM-2 asosida).
// Karta holatlari:
//   new      — hali ko'rilmagan
//   learning — endi o'rganilayotgan yoki unutilgan (daqiqalik qadamlar)
//   review   — o'rganilgan, kunlik oraliq bilan qaytadi
// Misol (Good bosilaversa): yangi -> 10 daq -> 1 kun -> ~3 kun -> ~8 kun -> ...
// Again bosilsa karta qayta o'rganishga tushadi (10 daq), keyin Good -> 1 kun.
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

// Yangi karta qadamlari (daqiqa): Again -> 1 daq, Good -> 10 daq, yana Good -> o'rganildi
const LEARN_STEPS = [1, 10];
// Unutilgan karta qadamlari
const RELEARN_STEPS = [10];
const GRADUATE_DAYS = 1; // qadamlar tugagach birinchi oraliq
const EASY_DAYS = 4; // yangi kartada Easy bosilsa darhol shu oraliq
export const START_EF = 2.5; // ease 250%
const MIN_EF = 1.3;
const HARD_FACTOR = 1.2;
const EASY_BONUS = 1.3;

export const RATINGS = [
  { id: 0, label: "Again", key: "1" },
  { id: 1, label: "Hard", key: "2" },
  { id: 2, label: "Good", key: "3" },
  { id: 3, label: "Easy", key: "4" },
];

const days = (n) => Math.max(1, Math.round(n));

// Daqiqalik qadamda turgan karta (yangi yoki qayta o'rganilayotgan)
function scheduleLearning(srs, rating, now) {
  // Avval o'rganilgan, keyin unutilgan karta: interval eski oraliqni saqlaydi
  const relearning = srs.state === "learning" && srs.interval > 0;
  const steps = relearning ? RELEARN_STEPS : LEARN_STEPS;
  const step = srs.state === "new" ? 0 : Math.min(srs.step || 0, steps.length - 1);
  const base = {
    ease: srs.ease || START_EF,
    reps: (srs.reps || 0) + 1,
    lapses: srs.lapses || 0,
  };
  const stay = (s, minutes) => ({
    ...base,
    state: "learning",
    interval: relearning ? srs.interval : 0,
    step: s,
    due: now + minutes * MIN,
  });
  const graduate = (d) => ({
    ...base,
    state: "review",
    interval: d,
    step: 0,
    due: now + d * DAY,
  });

  if (rating === 0) return stay(0, steps[0]);
  if (rating === 1) {
    // Hard: birinchi qadamda — 1 va 2-qadam o'rtasi, aks holda shu qadam qaytariladi
    const m =
      step === 0
        ? steps.length > 1
          ? (steps[0] + steps[1]) / 2
          : steps[0] * 1.5
        : steps[step];
    return stay(step, m);
  }
  if (rating === 2) {
    if (step + 1 < steps.length) return stay(step + 1, steps[step + 1]);
    return graduate(GRADUATE_DAYS);
  }
  return graduate(relearning ? GRADUATE_DAYS + 1 : EASY_DAYS);
}

export function schedule(srs, rating, now = Date.now()) {
  if (srs.state !== "review") return scheduleLearning(srs, rating, now);

  const ef = srs.ease || START_EF;
  const cur = Math.max(1, srs.interval || 1);
  const reps = (srs.reps || 0) + 1;

  if (rating === 0) {
    // Unutildi: ease 20% kamayadi, karta qayta o'rganishga tushadi
    return {
      state: "learning",
      ease: Math.max(MIN_EF, ef - 0.2),
      interval: cur,
      reps,
      lapses: (srs.lapses || 0) + 1,
      step: 0,
      due: now + RELEARN_STEPS[0] * MIN,
    };
  }

  // Har keyingi tugma oldingisidan kamida 1 kun uzunroq
  const hard = Math.max(cur + 1, days(cur * HARD_FACTOR));
  const good = Math.max(hard + 1, days(cur * ef));
  const easy = Math.max(good + 1, days(cur * ef * EASY_BONUS));
  const interval = [null, hard, good, easy][rating];
  const ease = [null, Math.max(MIN_EF, ef - 0.15), ef, ef + 0.15][rating];

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

// t — tarjima funksiyasi (i18n): "unit.min" va h.k. kalitlar.
// Daqiqalik oraliqlar Anki'dagidek "<10 daq" ko'rinishida
export function fmtInterval(ms, t = (k, v) => `${v.n} ${k.slice(5)}`) {
  const min = Math.round(ms / MIN);
  if (min < 60) return `<${t("unit.min", { n: Math.max(1, min) })}`;
  const h = Math.round(min / 60);
  if (h < 24) return t("unit.h", { n: h });
  const d = Math.round(ms / DAY);
  if (d < 30) return t("unit.d", { n: d });
  if (d < 365) return t("unit.mo", { n: Number((d / 30).toFixed(1)) });
  return t("unit.y", { n: Number((d / 365).toFixed(1)) });
}

export const previewLabels = (srs, t, now = Date.now()) =>
  RATINGS.map((r) => fmtInterval(schedule(srs, r.id, now).due - now, t));

// Shu oyna ichida qaytadigan karta sessiya navbatiga qaytariladi
export const LEARN_AGAIN_WINDOW = 20 * MIN;
