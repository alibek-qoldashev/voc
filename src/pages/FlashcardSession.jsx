import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { countNewCards, getStudyQueue, gradeCard } from "../lib/api";
import {
  LEARN_AGAIN_WINDOW,
  RATINGS,
  previewLabels,
  schedule,
} from "../lib/srs";
import { maskTerm, shuffle, speak } from "../lib/utils";
import { useStudy } from "../lib/study";
import { useLang } from "../lib/i18n";
import {
  Btn,
  CardImage,
  ErrorBox,
  Spinner,
  SpeakIcon,
  btnClass,
} from "../components/ui";

// Pastki hisoblagich: Anki'dagidek New — ko'k, Learning — qizil, Review — yashil
const COUNTERS = [
  { state: "new", cls: "text-sky" },
  { state: "learning", cls: "text-rose" },
  { state: "review", cls: "text-[#8fe36b]" },
];

const RATE_KEYS = ["again", "hard", "good", "easy"];

// Qayta chiqadigan karta navbatda kamida shuncha kartadan keyin turadi
const REQUEUE_GAP = 3;

const rateStyle = [
  "border-rose/50 text-rose hover:bg-rose/10",
  "border-amber/50 text-amber hover:bg-amber/10",
  "border-leaf/60 text-[#8fe36b] hover:bg-leaf/15",
  "border-sky/50 text-sky hover:bg-sky/10",
];

export default function FlashcardSession() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { settings, filter, order, say } = useStudy();
  const { t } = useLang();
  const [queue, setQueue] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  // Kunlik limit tufayli bugun navbatga tushmagan yangi kartalar soni
  const [waiting, setWaiting] = useState(0);
  // Har bir navbat elementining asl tartib raqami: aralashtirish o'chirilsa shu tartib tiklanadi
  const seq = useRef(0);
  const numbered = (items) => items.map((i) => ({ ...i, seq: seq.current++ }));

  useEffect(() => {
    let alive = true;
    Promise.all([getStudyQueue(deckId), countNewCards(deckId)])
      .then(([all, newTotal]) => {
        const items = order(filter(all, (i) => i.card.id));
        const newInQueue = all.filter((i) => i.card.srs_state === "new").length;
        if (alive) {
          setQueue(numbered(items));
          setTotal(items.length);
          setWaiting(Math.max(0, newTotal - newInQueue));
        }
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [deckId]);

  // Limitdan tashqari: kutib turgan yangi kartalarni hozir o'qish
  const studyWaiting = async () => {
    try {
      const extra = await getStudyQueue(deckId, { extraNew: waiting });
      const items = order(
        filter(extra, (i) => i.card.id).filter((i) => i.card.srs_state === "new"),
      );
      setQueue(numbered(items));
      setTotal((n) => n + items.length);
      setWaiting(0);
    } catch (e) {
      setError(e.message);
    }
  };

  const current = queue?.[0];

  // Sozlamalarda aralashtirish bosilsa: sessiya qayta boshlanmaydi, joriy kartadan keyingilar
  // qayta tartiblanadi (yoqilsa tasodifiy, o'chirilsa asl tartib)
  const firstShuffle = useRef(true);
  useEffect(() => {
    if (firstShuffle.current) {
      firstShuffle.current = false;
      return;
    }
    setQueue((q) => {
      if (!q || q.length < 2) return q;
      const [head, ...rest] = q;
      return [
        head,
        ...(settings.shuffle
          ? shuffle(rest)
          : [...rest].sort((a, b) => a.seq - b.seq)),
      ];
    });
  }, [settings.shuffle]);

  // Text to speech: ko'rinib turgan tomonni o'qiydi
  useEffect(() => {
    if (!current) return;
    const c = current.card;
    const def = c.definition || c.translation;
    say(flipped !== reverse ? def : c.term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.card.id, flipped, reverse, done]);
  const back = deckId === "all" ? "/flashcards" : `/flashcards/deck/${deckId}`;

  const grade = useCallback(
    (rating) => {
      if (!current) return;
      const now = Date.now();
      const next = schedule(current.srs, rating, now);
      // Optimistik: ekranni darrov yangilaymiz, saqlash fonda ketadi
      gradeCard({
        card: current.card,
        srs: next,
        rating,
        wasNew: current.srs.state === "new",
      }).catch((e) => setError(t("anki.saveError", { msg: e.message })));
      setQueue((q) => {
        const [head, ...rest] = q;
        if (next.due - now >= LEARN_AGAIN_WINDOW) return rest;
        // Tez qaytadigan karta: aralashtirish yoqilsa navbatning tasodifiy joyiga
        // (har aylanishda tartib boshqacha bo'ladi), aks holda oxiriga
        const item = { card: head.card, srs: next, seq: seq.current++ };
        const from = Math.min(REQUEUE_GAP, rest.length);
        const at = settings.shuffle
          ? from + Math.floor(Math.random() * (rest.length - from + 1))
          : rest.length;
        return [...rest.slice(0, at), item, ...rest.slice(at)];
      });
      setFlipped(false);
      setDone((d) => d + 1);
    },
    [current, settings.shuffle],
  );

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !current)
        return;
      if ((e.key === " " || e.key === "Enter") && tag !== "BUTTON") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && ["1", "2", "3", "4"].includes(e.key)) {
        grade(Number(e.key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, flipped, grade]);

  if (!queue && !error) return <Spinner label={t("anki.preparing")} />;

  if (!current) {
    return (
      <div className="mx-auto max-w-xl">
        <ErrorBox>{error}</ErrorBox>
        <div className="glass mt-4 rounded-3xl p-10 text-center">
          <h1 className="text-3xl font-extrabold">
            {waiting > 0
              ? t("anki.limitTitle")
              : total
                ? t("anki.complete")
                : t("anki.nothing")}
          </h1>
          {total > 0 && (
            <p className="mt-3 text-mist">{t("anki.answered", { count: done })}</p>
          )}
          {waiting > 0 ? (
            <p className="mt-3 text-mist">
              {t("anki.limitHint", { count: waiting })}
            </p>
          ) : (
            !total && <p className="mt-3 text-mist">{t("anki.nothingHint")}</p>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {waiting > 0 && (
              <Btn onClick={studyWaiting}>
                {t("anki.studyWaiting", { count: waiting })}
              </Btn>
            )}
            <Btn
              variant={waiting > 0 ? "glass" : "primary"}
              onClick={() => navigate(back)}
            >
              {t("common.done")}
            </Btn>
            <Link to="/home" className={btnClass("glass")}>
              {t("nav.home")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const c = current.card;
  const labels = previewLabels(current.srs, t);
  const termFace = (
    <>
      <CardImage src={c.term_image} />
      <p className="text-5xl font-extrabold sm:text-6xl">{c.term}</p>
    </>
  );
  const defFace = (
    <>
      <CardImage src={c.definition_image} />
      {c.translation && (
        <p className="text-3xl font-extrabold text-[#8fe36b]">
          {c.translation}
        </p>
      )}
      {c.definition && (
        <p className="mt-3 text-xl leading-snug">{c.definition}</p>
      )}
    </>
  );
  const hint = c.example && (
    <p className="mt-8 max-w-md text-base italic text-mist">
      {maskTerm(c.example, c.term)}
    </p>
  );
  const full = c.example && (
    <p className="mt-6 max-w-md text-base italic text-mist">{c.example}</p>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-end gap-3">
        <label className="flex items-center gap-2 text-sm text-mist">
          <input
            type="checkbox"
            checked={reverse}
            onChange={(e) => {
              setReverse(e.target.checked);
              setFlipped(false);
            }}
          />
          {t("anki.defFirst")}
        </label>
      </div>

      <div
        className="mb-1 flex justify-between text-sm text-mist"
        aria-live="polite"
      >
        <span>{t("study.left", { n: queue.length })}</span>
        <span>{t("anki.answeredCount", { n: done })}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-leaf transition-all"
          style={{
            width: `${(done / Math.max(1, done + queue.length)) * 100}%`,
          }}
        />
      </div>

      <ErrorBox>{error}</ErrorBox>

      <div
        className={`flip mt-6 cursor-pointer ${flipped ? "is-flipped" : ""}`}
        onClick={() => setFlipped((f) => !f)}
      >
        <div className="flip-inner relative h-[clamp(13rem,calc(100dvh-30rem),26rem)]">
          <div className="face glass absolute inset-0 flex flex-col items-center justify-center rounded-3xl px-8 text-center">
            {reverse ? defFace : termFace}
            {!reverse && hint}
          </div>
          <div className="face face-back glass absolute inset-0 flex flex-col items-center justify-center rounded-3xl px-8 text-center">
            {reverse ? termFace : defFace}
            {full}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex justify-center">
          <Btn
            variant="glass"
            onClick={() => speak(c.term)}
            aria-label={t("common.listenTo", { term: c.term })}
          >
            <SpeakIcon /> {t("common.listen")}
          </Btn>
        </div>

        <div
          className="flex justify-center gap-5 text-sm font-semibold"
          aria-label={t("anki.counts")}
        >
          {COUNTERS.map(({ state, cls }) => (
            <span
              key={state}
              className={`${cls} ${current.srs.state === state ? "underline underline-offset-4" : "opacity-80"}`}
            >
              {t(`anki.state.${state}`)}{" "}
              {queue.filter((i) => i.srs.state === state).length}
            </span>
          ))}
        </div>

        {!flipped ? (
          <Btn
            className="w-full py-4 text-base"
            onClick={() => setFlipped(true)}
          >
            {t("keys.showAnswer")}{" "}
            <span className="text-xs font-normal opacity-70">(Space)</span>
          </Btn>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {RATINGS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => grade(r.id)}
                className={`flex flex-col items-center rounded-2xl border bg-white/5 px-2 py-3 text-sm font-bold transition-colors ${rateStyle[r.id]}`}
              >
                <span className="text-xs font-normal text-mist">
                  {labels[r.id]}
                </span>
                <span>{t(`anki.rate.${RATE_KEYS[r.id]}`)}</span>
                <span className="text-[0.7rem] font-normal text-mist">
                  {t("anki.key", { k: r.key })}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
