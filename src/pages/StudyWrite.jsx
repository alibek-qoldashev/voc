import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCards, logPractice } from "../lib/api";
import { levenshtein, maskTerm, normalize, shuffle, speak } from "../lib/utils";
import { Btn, ErrorBox, Spinner, SpeakIcon, fieldCls } from "../components/ui";

export default function StudyWrite() {
  const { deckId } = useParams();
  const [cards, setCards] = useState(null);
  const [queue, setQueue] = useState([]);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null); // { correct, near }
  const [stats, setStats] = useState({ right: 0, wrong: 0 });
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    getCards(deckId)
      .then((cs) => {
        setCards(cs);
        setQueue(shuffle(cs).map((c) => c.id));
      })
      .catch((e) => setError(e.message));
  }, [deckId]);

  useEffect(() => {
    if (!result) inputRef.current?.focus();
  }, [result, queue]);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!cards) return <Spinner label="Getting your words" />;
  if (cards.length === 0) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <p className="text-xl font-bold">This deck is empty</p>
        <Link
          to={`/flashcards/deck/${deckId}`}
          className="mt-5 inline-block text-leaf underline"
        >
          Back to the deck
        </Link>
      </div>
    );
  }

  const card = cards.find((c) => c.id === queue[0]);

  if (!card) {
    const total = stats.right + stats.wrong;
    return (
      <div className="mx-auto max-w-xl">
        <div className="glass rounded-3xl p-10 text-center">
          <h1 className="text-3xl font-extrabold">All done</h1>
          <p className="mt-3 text-mist">
            {stats.right} of {total} typed correctly
            {total ? ` (${Math.round((stats.right / total) * 100)}%)` : ""}.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Btn
              onClick={() => {
                setQueue(shuffle(cards).map((c) => c.id));
                setStats({ right: 0, wrong: 0 });
                setAnswer("");
                setResult(null);
              }}
            >
              Go again
            </Btn>
            <Link
              to={`/flashcards/deck/${deckId}`}
              className="self-center text-sm text-mist underline"
            >
              Back to deck
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const check = (e) => {
    e.preventDefault();
    if (result || !answer.trim()) return;
    const given = normalize(answer);
    const want = normalize(card.term);
    const exact = given === want;
    const near = !exact && want.length >= 5 && levenshtein(given, want) === 1;
    const correct = exact || near;
    setResult({ correct, near });
    setStats((s) => ({
      right: s.right + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }));
    logPractice(deckId, card.id, correct).catch(() => {});
  };

  const next = () => {
    const wasCorrect = result.correct;
    setQueue((q) => (wasCorrect ? q.slice(1) : [...q.slice(1), q[0]]));
    setAnswer("");
    setResult(null);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          to={`/flashcards/deck/${deckId}`}
          className="text-sm text-mist hover:text-leaf"
        >
          ← Exit
        </Link>
        <span className="text-sm text-mist">{queue.length} left</span>
      </div>

      <section className="glass rounded-3xl p-7">
        <p className="text-sm text-mist">Type the term</p>
        <p className="mt-2 text-2xl font-bold leading-snug">
          {card.definition || card.translation}
        </p>
        {card.definition && card.translation && (
          <p className="mt-2 font-semibold text-[#8fe36b]">
            {card.translation}
          </p>
        )}
        {card.example && (
          <p className="mt-3 text-base italic text-mist">
            {maskTerm(card.example, card.term)}
          </p>
        )}
      </section>

      <form onSubmit={check} className="mt-5 flex flex-wrap gap-3">
        <input
          ref={inputRef}
          disabled={!!result}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className={`${fieldCls} min-w-0 flex-1 text-base`}
          placeholder="Your answer"
          aria-label="Your answer"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <Btn type="submit" disabled={!!result || !answer.trim()}>
          Check
        </Btn>
      </form>

      {result && (
        <div
          className={`mt-5 rounded-2xl border p-5 ${result.correct ? "border-leaf/50 bg-leaf/10" : "border-rose/50 bg-rose/10"}`}
          role="status"
        >
          <p
            className={`font-bold ${result.correct ? "text-[#8fe36b]" : "text-rose"}`}
          >
            {result.correct
              ? result.near
                ? "Correct, watch the spelling"
                : "Correct"
              : "Not quite"}
          </p>
          {(!result.correct || result.near) && (
            <p className="mt-1">
              Answer: <span className="text-xl font-bold">{card.term}</span>
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Btn autoFocus onClick={next}>
              Continue
            </Btn>
            <Btn
              variant="glass"
              onClick={() => speak(card.term)}
              aria-label="Listen"
            >
              <SpeakIcon /> Listen
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
