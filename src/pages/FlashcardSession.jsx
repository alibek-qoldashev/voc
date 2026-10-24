import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getStudyQueue, gradeCard } from "../lib/api";
import {
  LEARN_AGAIN_WINDOW,
  RATINGS,
  previewLabels,
  schedule,
} from "../lib/srs";
import { maskTerm, speak } from "../lib/utils";
import { Btn, ErrorBox, Spinner, SpeakIcon, btnClass } from "../components/ui";

const rateStyle = [
  "border-rose/50 text-rose hover:bg-rose/10",
  "border-amber/50 text-amber hover:bg-amber/10",
  "border-leaf/60 text-[#8fe36b] hover:bg-leaf/15",
  "border-sky/50 text-sky hover:bg-sky/10",
];

export default function FlashcardSession() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [queue, setQueue] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getStudyQueue(deckId)
      .then((items) => {
        if (alive) {
          setQueue(items);
          setTotal(items.length);
        }
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [deckId]);

  const current = queue?.[0];
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
      }).catch((e) => setError(`Could not save your progress: ${e.message}`));
      setQueue((q) => {
        const [head, ...rest] = q;
        return next.due - now < LEARN_AGAIN_WINDOW
          ? [...rest, { card: head.card, srs: next }]
          : rest;
      });
      setFlipped(false);
      setDone((d) => d + 1);
    },
    [current],
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

  if (!queue && !error) return <Spinner label="Preparing your cards" />;

  if (!current) {
    return (
      <div className="mx-auto max-w-xl">
        <ErrorBox>{error}</ErrorBox>
        <div className="glass mt-4 rounded-3xl p-10 text-center">
          <h1 className="text-3xl font-extrabold">
            {total ? "Session complete" : "Nothing to study right now"}
          </h1>
          <p className="mt-3 text-mist">
            {total
              ? `You answered ${done} cards. Cards come back automatically when they are due.`
              : "There are no due or new cards here. Add more terms or come back later."}
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Btn onClick={() => navigate(back)}>Done</Btn>
            <Link to="/home" className={btnClass("glass")}>
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const c = current.card;
  const labels = previewLabels(current.srs);
  const termFace = (
    <p className="text-5xl font-extrabold sm:text-6xl">{c.term}</p>
  );
  const defFace = (
    <>
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
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link to={back} className="text-sm text-mist hover:text-leaf">
          ← Exit
        </Link>
        <label className="flex items-center gap-2 text-sm text-mist">
          <input
            type="checkbox"
            checked={reverse}
            onChange={(e) => {
              setReverse(e.target.checked);
              setFlipped(false);
            }}
          />
          Definition first
        </label>
      </div>

      <div
        className="mb-1 flex justify-between text-sm text-mist"
        aria-live="polite"
      >
        <span>{queue.length} left</span>
        <span>{done} answered</span>
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
        <div className="flip-inner relative h-[22rem] sm:h-[26rem]">
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
            aria-label={`Listen to ${c.term}`}
          >
            <SpeakIcon /> Listen
          </Btn>
        </div>

        {!flipped ? (
          <Btn
            className="w-full py-4 text-base"
            onClick={() => setFlipped(true)}
          >
            Show answer{" "}
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
                <span>{r.label}</span>
                <span className="text-xs font-normal text-mist">
                  {labels[r.id]} (key {r.key})
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
