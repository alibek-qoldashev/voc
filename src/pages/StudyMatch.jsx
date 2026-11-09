import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCards, logPractice } from "../lib/api";
import { definitionOnly, withMeaning, shuffle } from "../lib/utils";
import { useStudy } from "../lib/study";
import { useLang } from "../lib/i18n";
import { studyBack } from "../lib/decks";
import { Btn, ErrorBox, Spinner, btnClass, backLinkCls } from "../components/ui";

const PAIRS = 6;

const deal = (cards, order) =>
  shuffle(
    order(cards)
      .slice(0, PAIRS)
      .flatMap((c) => [
        { key: `${c.id}-t`, pair: c.id, deck: c.deck_id, text: c.term, kind: "term" },
        {
          key: `${c.id}-d`,
          pair: c.id,
          deck: c.deck_id,
          text: definitionOnly(c),
          kind: "def",
        },
      ]),
  );

export default function StudyMatch() {
  const { deckId } = useParams();
  const { meaning, filter, order, say } = useStudy();
  const uz = meaning === "uzbek";
  const { t } = useLang();
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
        const usable = withMeaning(filter(cs), meaning).filter(
          (c) => c.definition || c.translation,
        );
        setCards(usable);
        setTiles(deal(usable, order));
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
  if (!cards) return <Spinner label={t("match.dealing")} />;
  if (cards.length < 3) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <p className="text-xl font-bold">{t("study.notEnough")}</p>
        <p className="mt-1 text-mist">
          {t(uz ? "meaning.needsUz" : "match.needs", { count: 3 })}
        </p>
        <Link
          to={studyBack(deckId).to}
          className={`${backLinkCls} mt-5`}
        >
          {t(studyBack(deckId).label)}
        </Link>
      </div>
    );
  }

  const pairCount = tiles.length / 2;
  const sec = (ms) => (ms / 1000).toFixed(1);

  const restart = () => {
    setTiles(deal(cards, order));
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
    // O'zbekcha matnni inglizcha ovoz o'qimaydi
    if (!(uz && tile.kind === "def")) say(tile.text);
    if (!startedAt) setStartedAt(Date.now());
    if (!selected) return setSelected(tile.key);

    const first = tiles.find((t) => t.key === selected);
    if (first.pair === tile.pair && first.key !== tile.key) {
      const next = new Set(matched).add(tile.pair);
      setMatched(next);
      setSelected(null);
      logPractice(tile.deck, tile.pair, true).catch(() => {});
      if (next.size === pairCount) {
        setElapsed(Date.now() - startedAt);
        setFinished(true);
      }
    } else {
      setWrong([first.key, tile.key]);
      setMistakes((m) => m + 1);
      setSelected(null);
      logPractice(tile.deck, tile.pair, false).catch(() => {});
      setTimeout(() => setWrong([]), 600);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      {!finished && (
        <div className="mb-5 flex items-center justify-end gap-3">
          <span className="font-bold tabular-nums">
            {t("match.sec", { n: sec(elapsed) })}
          </span>
        </div>
      )}

      {finished && (
        <div className="glass mx-auto max-w-xl rounded-3xl p-10 text-center" role="status">
          <h1 className="text-3xl font-extrabold">{t("match.finished")}</h1>
          <p className="mt-4 text-6xl font-extrabold tabular-nums text-leaf">
            {t("match.sec", { n: sec(elapsed) })}
          </p>
          <p className="mt-3 text-mist">
            {t("match.mistakes", { count: mistakes })}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={studyBack(deckId).to} className={btnClass("primary")}>
              {t(studyBack(deckId).label)}
            </Link>
            <Btn variant="glass" onClick={restart}>
              {t("match.again")}
            </Btn>
          </div>
        </div>
      )}

      <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${finished ? "hidden" : ""}`}>
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
      {!finished && <p className="mt-4 text-sm text-mist">{t("match.hint")}</p>}
    </div>
  );
}
