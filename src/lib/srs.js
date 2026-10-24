// Anki uslubidagi oraliqli takrorlash: learning steps + SM-2
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

// Yangi so'z shu bosqichlardan o'tadi, so'ng "review" ga chiqadi.
// Ya'ni bitta so'z sessiya ichida kamida ikki marta ko'rsatiladi.
const LEARN_STEPS = [1 * MIN, 10 * MIN];

// Bosqichlar tugaganda beriladigan birinchi oraliq
const GRADUATING_INTERVAL = 1; // kun
const EASY_INTERVAL = 4; // kun ("Easy" bosilsa, bosqichlarni o'tkazib yuboradi)

// Xatodan keyin qaytish bosqichi
const RELEARN_STEP = 10 * MIN;

export const RATINGS = [
  { id: 0, label: "Again", key: "1" },
  { id: 1, label: "Hard", key: "2" },
  { id: 2, label: "Good", key: "3" },
  { id: 3, label: "Easy", key: "4" },
];

export function schedule(srs, rating, now = Date.now()) {
  let { state, ease, interval, reps, lapses, step = 0 } = srs;
  reps += 1;

  // --- Takrorlash bosqichi (review) ---
  if (state === "review") {
    if (rating === 0) {
      // Unutildi: so'z yana o'rganish bosqichiga qaytadi
      lapses += 1;
      ease = Math.max(1.3, ease - 0.2);
      interval = Math.max(1, Math.round(interval * 0.5));
      return {
        state: "learning",
        ease,
        interval,
        reps,
        lapses,
        step: 0,
        due: now + RELEARN_STEP,
      };
    }
    if (rating === 1) {
      ease = Math.max(1.3, ease - 0.15);
      interval = Math.max(interval + 1, Math.round(interval * 1.2));
    } else if (rating === 2) {
      interval = Math.max(interval + 1, Math.round(interval * ease));
    } else {
      ease += 0.15;
      interval = Math.max(interval + 1, Math.round(interval * ease * 1.3));
    }
    return {
      state: "review",
      ease,
      interval,
      reps,
      lapses,
      step: 0,
      due: now + interval * DAY,
    };
  }

  // --- Yangi yoki o'rganish bosqichi ---
  if (rating === 3) {
    // Easy: bosqichlarni o'tkazib, to'g'ridan-to'g'ri takrorlashga
    return {
      state: "review",
      ease,
      interval: EASY_INTERVAL,
      reps,
      lapses,
      step: 0,
      due: now + EASY_INTERVAL * DAY,
    };
  }
  if (rating === 0) {
    // Again: birinchi bosqichga qaytadi
    return {
      state: "learning",
      ease,
      interval,
      reps,
      lapses,
      step: 0,
      due: now + LEARN_STEPS[0],
    };
  }
  if (rating === 1) {
    // Hard: shu bosqich qaytariladi
    return {
      state: "learning",
      ease,
      interval,
      reps,
      lapses,
      step,
      due: now + LEARN_STEPS[Math.min(step, LEARN_STEPS.length - 1)],
    };
  }

  // Good: keyingi bosqichga
  const nextStep = step + 1;
  if (nextStep < LEARN_STEPS.length) {
    return {
      state: "learning",
      ease,
      interval,
      reps,
      lapses,
      step: nextStep,
      due: now + LEARN_STEPS[nextStep],
    };
  }
  // Bosqichlar tugadi: so'z endi takrorlash jadvaliga o'tadi
  return {
    state: "review",
    ease,
    interval: GRADUATING_INTERVAL,
    reps,
    lapses,
    step: 0,
    due: now + GRADUATING_INTERVAL * DAY,
  };
}

export function fmtInterval(ms) {
  const min = Math.round(ms / MIN);
  if (min < 1) return "<1 min";
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(ms / DAY);
  if (d < 30) return `${d} d`;
  if (d < 365) return `${Math.round(d / 30)} mo`;
  return `${(d / 365).toFixed(1)} y`;
}

export const previewLabels = (srs, now = Date.now()) =>
  RATINGS.map((r) => fmtInterval(schedule(srs, r.id, now).due - now));

// Shu oyna ichida qaytadigan karta sessiya navbatiga qaytariladi
export const LEARN_AGAIN_WINDOW = 20 * MIN;
