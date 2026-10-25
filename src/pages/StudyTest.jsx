import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCards, logPractice } from "../lib/api";
import { shuffle } from "../lib/utils";
import { useStudy } from "../lib/study";
import { useLang } from "../lib/i18n";
import { Btn, ErrorBox, Spinner } from "../components/ui";

const QUESTION_LIMIT = 20;

export default function StudyTest() {
  const { deckId } = useParams();
  const { filter, order, say } = useStudy();
  const { t } = useLang();
  const [cards, setCards] = useState(null);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);

  useEffect(() => {
    getCards(deckId)
      .then((cs) =>
        setCards(filter(cs).filter((c) => c.definition || c.translation)),
      )
      .catch((e) => setError(e.message));
  }, [deckId]);

  const questions = useMemo(() => {
    if (!cards || cards.length < 4) return [];
    return order(cards)
      .slice(0, QUESTION_LIMIT)
      .map((card) => {
        const others = shuffle(cards.filter((c) => c.id !== card.id)).slice(
          0,
          3,
        );
        return { card, options: shuffle([card, ...others]) };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, round]);

  const asked = questions[index]?.card;
  useEffect(() => {
    if (asked) say(asked.definition || asked.translation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked?.id, round]);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!cards) return <Spinner label={t("test.building")} />;
  if (cards.length < 4) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <p className="text-xl font-bold">{t("study.notEnough")}</p>
        <p className="mt-1 text-mist">
          {t("test.needs")}
        </p>
        <Link
          to={`/flashcards/deck/${deckId}`}
          className="mt-5 inline-block text-leaf underline"
        >
          {t("study.backToDeck")}
        </Link>
      </div>
    );
  }

  const q = questions[index];

  if (!q) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="mx-auto max-w-xl">
        <div className="glass rounded-3xl p-10 text-center">
          <h1 className="text-3xl font-extrabold">{t("test.finished")}</h1>
          <p className="mt-3 text-5xl font-extrabold text-leaf">{pct}%</p>
          <p className="mt-2 text-mist">
            {t("test.score", { n: score, total: questions.length })}
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Btn
              onClick={() => {
                setRound((r) => r + 1);
                setIndex(0);
                setScore(0);
                setPicked(null);
              }}
            >
              {t("study.tryAgain")}
            </Btn>
            <Link
              to={`/flashcards/deck/${deckId}`}
              className="self-center text-sm text-mist underline"
            >
              {t("study.backToDeck")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const choose = (opt) => {
    if (picked) return;
    const right = opt.id === q.card.id;
    setPicked(opt.id);
    if (right) setScore((s) => s + 1);
    logPractice(deckId, q.card.id, right).catch(() => {});
  };

  const next = () => {
    setPicked(null);
    setIndex((i) => i + 1);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-end gap-3">
        <span className="text-sm text-mist">
          {index + 1} / {questions.length}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-leaf transition-all"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>

      <section className="glass mt-6 rounded-3xl p-7">
        <p className="text-sm text-mist">{t("test.question")}</p>
        <p className="mt-2 text-2xl font-bold leading-snug">
          {q.card.definition || q.card.translation}
        </p>
      </section>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {q.options.map((o) => {
          const isAnswer = picked && o.id === q.card.id;
          const isWrongPick = picked === o.id && o.id !== q.card.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={!!picked}
                onClick={() => choose(o)}
                className={`w-full rounded-2xl border px-4 py-4 text-left font-bold transition-colors ${
                  isAnswer
                    ? "border-leaf bg-leaf/15 text-[#8fe36b]"
                    : isWrongPick
                      ? "border-rose bg-rose/10 text-rose"
                      : "glass hover:border-white/40 disabled:opacity-60"
                }`}
              >
                {o.term}
              </button>
            </li>
          );
        })}
      </ul>

      {picked && (
        <div className="mt-6 flex items-center justify-between gap-4">
          <p
            className={
              picked === q.card.id
                ? "font-bold text-[#8fe36b]"
                : "font-bold text-rose"
            }
          >
            {picked === q.card.id
              ? t("study.correct")
              : t("test.correctAnswer", { term: q.card.term })}
          </p>
          <Btn autoFocus onClick={next}>
            {index + 1 === questions.length ? t("test.seeScore") : t("test.next")}
          </Btn>
        </div>
      )}
    </div>
  );
}
