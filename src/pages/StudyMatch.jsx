import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCards, logPractice } from "../lib/api";
import { shuffle } from "../lib/utils";
import { Btn, ErrorBox, Spinner } from "../components/ui";

const PAIRS = 6;

const deal = (cards) =>
  shuffle(
    shuffle(cards)
      .slice(0, PAIRS)
      .flatMap((c) => [
        { key: `${c.id}-t`, pair: c.id, text: c.term, kind: "term" },
        {
          key: `${c.id}-d`,
          pair: c.id,
          text: c.definition || c.translation,
          kind: "def",
        },
      ]),
  );

export default function StudyMatch() {
  const { deckId } = useParams();
  const [cards, setCards] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [matched, setMatched] = useState(() => new Set());
  const [wrong, setWrong] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    getCards(deckId)
      .then((cs) => {
        const usable = cs.filter((c) => c.definition || c.translation);
        setCards(usable);
        setTiles(deal(usable));
      })
      .catch((e) => setError(e.message));
  }, [deckId]);

  useEffect(() => {
    if (startedAt && !finished) {
      timer.current = setInterval(
        () => setElapsed(Date.now() - startedAt),
        100,
      );
      return () => clearInterval(timer.current);
    }
  }, [startedAt, finished]);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!cards) return <Spinner label="Dealing the cards" />;
  if (cards.length < 3) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <p className="text-xl font-bold">Not enough cards</p>
        <p className="mt-1 text-mist">
          Match needs at least 3 cards that have a definition.
        </p>
        <Link
          to={`/flashcards/deck/${deckId}`}
          className="mt-5 inline-block text-leaf underline"
        >
          Back to the deck
        </Link>
      </div>
    );
  }

  const pairCount = tiles.length / 2;
  const sec = (ms) => (ms / 1000).toFixed(1);

  const restart = () => {
    setTiles(deal(cards));
    setSelected(null);
    setMatched(new Set());
    setWrong([]);
    setMistakes(0);
    setStartedAt(null);
    setElapsed(0);
    setFinished(false);
  };

  const click = (tile) => {
    if (
      finished ||
      matched.has(tile.pair) ||
      selected === tile.key ||
      wrong.length
    )
      return;
    if (!startedAt) setStartedAt(Date.now());
    if (!selected) return setSelected(tile.key);

    const first = tiles.find((t) => t.key === selected);
    if (first.pair === tile.pair && first.key !== tile.key) {
      const next = new Set(matched).add(tile.pair);
      setMatched(next);
      setSelected(null);
      logPractice(deckId, tile.pair, true).catch(() => {});
      if (next.size === pairCount) {
        setElapsed(Date.now() - startedAt);
        setFinished(true);
      }
    } else {
      setWrong([first.key, tile.key]);
      setMistakes((m) => m + 1);
      setSelected(null);
      logPractice(deckId, tile.pair, false).catch(() => {});
      setTimeout(() => setWrong([]), 600);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          to={`/flashcards/deck/${deckId}`}
          className="text-sm text-mist hover:text-leaf"
        >
          ← Exit
        </Link>
        <span className="font-bold tabular-nums">{sec(elapsed)} s</span>
      </div>

      {finished && (
        <div className="glass mb-6 rounded-3xl p-7 text-center" role="status">
          <p className="text-3xl font-extrabold text-leaf">
            {sec(elapsed)} seconds
          </p>
          <p className="mt-2 text-mist">
            {mistakes} mistake{mistakes === 1 ? "" : "s"}.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Btn onClick={restart}>Play again</Btn>
            <Link
              to={`/flashcards/deck/${deckId}`}
              className="self-center text-sm text-mist underline"
            >
              Back to deck
            </Link>
          </div>
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => {
          const isMatched = matched.has(t.pair);
          const isSel = selected === t.key;
          const isWrong = wrong.includes(t.key);
          return (
            <li key={t.key}>
              <button
                type="button"
                aria-pressed={isSel}
                disabled={isMatched}
                onClick={() => click(t)}
                className={`flex min-h-28 w-full items-center justify-center rounded-2xl border px-3 py-3 text-center transition-colors ${
                  t.kind === "term" ? "text-lg font-bold" : "text-sm"
                } ${
                  isMatched
                    ? "border-leaf/30 bg-leaf/10 text-[#8fe36b] opacity-50"
                    : isWrong
                      ? "border-rose bg-rose/10"
                      : isSel
                        ? "border-leaf bg-leaf/20"
                        : "glass hover:border-white/40"
                }`}
              >
                <span className="line-clamp-4">{t.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-sm text-mist">
        Pair each term with its definition. The clock starts on your first tap.
      </p>
    </div>
  );
}
