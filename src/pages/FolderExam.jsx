import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getFolder, getFolderCards, logPractice } from "../lib/api";
import { shuffle } from "../lib/utils";
import { useLang } from "../lib/i18n";
import { Btn, ErrorBox, Spinner } from "../components/ui";

// Papkadagi barcha so'zlardan shuncha qismi imtihonga tushadi
const SHARE = 0.3;
const MATCH_GROUP = 4;
export const EXAM_MIN_WORDS = 4;

const answerOf = (c) => c.definition || c.translation;

// Tanlangan har bir so'z bitta savolga tushadi: juftlash, test yoki true/false
function buildExam(cards) {
  const count = Math.max(EXAM_MIN_WORDS, Math.round(cards.length * SHARE));
  const picked = shuffle(cards).slice(0, count);
  const byType = { match: [], choice: [], tf: [] };
  picked.forEach((c, i) => byType[["match", "choice", "tf"][i % 3]].push(c));

  const steps = [];
  for (let i = 0; i < byType.match.length; i += MATCH_GROUP) {
    const group = byType.match.slice(i, i + MATCH_GROUP);
    // Bitta so'zni juftlab bo'lmaydi — testga o'tkazamiz
    if (group.length > 1) steps.push({ type: "match", cards: group });
    else byType.choice.push(...group);
  }
  byType.choice.forEach((card) => {
    const others = shuffle(
      cards.filter((c) => c.id !== card.id && c.term !== card.term),
    ).slice(0, 3);
    steps.push({ type: "choice", cards: [card], options: shuffle([card, ...others]) });
  });
  byType.tf.forEach((card) => {
    const wrong = shuffle(
      cards.filter((c) => answerOf(c) && answerOf(c) !== answerOf(card)),
    )[0];
    const isTrue = !wrong || Math.random() < 0.5;
    steps.push({
      type: "tf",
      cards: [card],
      shown: isTrue ? answerOf(card) : answerOf(wrong),
      isTrue,
    });
  });
  return { steps: shuffle(steps), total: picked.length };
}

function Verdict({ correct, children, onNext, last }) {
  const { t } = useLang();
  return (
    <div
      role="status"
      className={`mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 ${
        correct ? "border-leaf/50 bg-leaf/10" : "border-rose/50 bg-rose/10"
      }`}
    >
      <div>
        <p className={`font-bold ${correct ? "text-[#8fe36b]" : "text-rose"}`}>
          {correct ? t("study.correct") : t("exam.wrong")}
        </p>
        {!correct && children}
      </div>
      <Btn autoFocus onClick={onNext}>
        {last ? t("test.seeScore") : t("test.next")}
      </Btn>
    </div>
  );
}

function ChoiceQuestion({ step, onDone, last }) {
  const { t } = useLang();
  const card = step.cards[0];
  const [picked, setPicked] = useState(null);
  const correct = picked === card.id;

  return (
    <>
      <section className="glass rounded-3xl p-7">
        <p className="text-sm text-mist">{t("test.question")}</p>
        <p className="mt-2 text-2xl font-bold leading-snug">{answerOf(card)}</p>
      </section>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {step.options.map((o) => {
          const isAnswer = picked && o.id === card.id;
          const isWrongPick = picked === o.id && o.id !== card.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={!!picked}
                onClick={() => setPicked(o.id)}
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
        <Verdict
          correct={correct}
          last={last}
          onNext={() => onDone([{ card, correct }])}
        >
          <p className="mt-1">
            {t("write.answerIs")} <span className="font-bold">{card.term}</span>
          </p>
        </Verdict>
      )}
    </>
  );
}

function TrueFalseQuestion({ step, onDone, last }) {
  const { t } = useLang();
  const card = step.cards[0];
  const [answer, setAnswer] = useState(null);
  const correct = answer === step.isTrue;

  const btn = (value, label, tone) => (
    <button
      type="button"
      disabled={answer !== null}
      onClick={() => setAnswer(value)}
      className={`rounded-2xl border py-4 text-lg font-bold transition-colors disabled:opacity-60 ${
        answer === value ? tone : "glass hover:border-white/40"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <section className="glass rounded-3xl p-7">
        <p className="text-sm text-mist">{t("exam.tfPrompt")}</p>
        <p className="mt-3 text-3xl font-extrabold">{card.term}</p>
        <p className="mt-3 text-xl leading-snug">{step.shown}</p>
      </section>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {btn(true, t("exam.true"), "border-leaf bg-leaf/15 text-[#8fe36b]")}
        {btn(false, t("exam.false"), "border-rose bg-rose/10 text-rose")}
      </div>
      {answer !== null && (
        <Verdict
          correct={correct}
          last={last}
          onNext={() => onDone([{ card, correct }])}
        >
          <p className="mt-1">
            <span className="font-bold">{card.term}</span> — {answerOf(card)}
          </p>
        </Verdict>
      )}
    </>
  );
}

// Juftlash: birinchi urinishda topilgan juftliklar to'g'ri hisoblanadi
function MatchQuestion({ step, onDone }) {
  const { t } = useLang();
  const [tiles] = useState(() =>
    shuffle(
      step.cards.flatMap((c) => [
        { key: `${c.id}-t`, pair: c.id, text: c.term, kind: "term" },
        { key: `${c.id}-d`, pair: c.id, text: answerOf(c), kind: "def" },
      ]),
    ),
  );
  const [selected, setSelected] = useState(null);
  const [matched, setMatched] = useState(() => new Set());
  const [missed, setMissed] = useState(() => new Set());
  const [wrong, setWrong] = useState([]);

  const click = (tile) => {
    if (matched.has(tile.pair) || selected === tile.key || wrong.length) return;
    if (!selected) return setSelected(tile.key);
    const first = tiles.find((x) => x.key === selected);
    setSelected(null);
    if (first.kind === tile.kind) return setSelected(tile.key);
    if (first.pair === tile.pair) {
      const next = new Set(matched).add(tile.pair);
      setMatched(next);
      if (next.size === step.cards.length) {
        setTimeout(
          () =>
            onDone(step.cards.map((c) => ({ card: c, correct: !missed.has(c.id) }))),
          500,
        );
      }
    } else {
      setMissed((m) => new Set(m).add(first.pair).add(tile.pair));
      setWrong([first.key, tile.key]);
      setTimeout(() => setWrong([]), 600);
    }
  };

  return (
    <>
      <p className="mb-3 text-sm text-mist">{t("learn.matchPrompt")}</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((x) => {
          const isMatched = matched.has(x.pair);
          return (
            <li key={x.key}>
              <button
                type="button"
                aria-pressed={selected === x.key}
                disabled={isMatched}
                onClick={() => click(x)}
                className={`flex min-h-24 w-full items-center justify-center rounded-2xl border px-3 py-3 text-center transition-colors ${
                  x.kind === "term" ? "text-lg font-bold" : "text-sm"
                } ${
                  isMatched
                    ? "border-leaf/30 bg-leaf/10 text-[#8fe36b] opacity-50"
                    : wrong.includes(x.key)
                      ? "border-rose bg-rose/10"
                      : selected === x.key
                        ? "border-leaf bg-leaf/20"
                        : "glass hover:border-white/40"
                }`}
              >
                <span className="line-clamp-4">{x.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function FolderExam() {
  const { folderId } = useParams();
  const { t } = useLang();
  const [folder, setFolder] = useState(null);
  const [cards, setCards] = useState(null);
  const [error, setError] = useState("");
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState([]);

  useEffect(() => {
    Promise.all([getFolder(folderId), getFolderCards(folderId)])
      .then(([f, cs]) => {
        setFolder(f);
        setCards(cs.filter(answerOf));
      })
      .catch((e) => setError(e.message));
  }, [folderId]);

  const exam = useMemo(
    () => (cards && cards.length >= EXAM_MIN_WORDS ? buildExam(cards) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards, round],
  );

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!cards || !folder) return <Spinner label={t("exam.preparing")} />;

  const back = `/folders/${folderId}`;
  const header = (
    <div className="mb-5 flex items-center justify-between gap-3">
      <Link to={back} className="text-sm text-mist hover:text-leaf">
        ← {folder.name}
      </Link>
      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-mist">
        {t("exam.title")}
      </span>
    </div>
  );

  if (!exam) {
    return (
      <div className="mx-auto max-w-xl">
        {header}
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-xl font-bold">{t("study.notEnough")}</p>
          <p className="mt-1 text-mist">
            {t("exam.needs", { count: EXAM_MIN_WORDS })}
          </p>
        </div>
      </div>
    );
  }

  const step = exam.steps[index];
  const answered = results.length;

  const restart = () => {
    setRound((r) => r + 1);
    setIndex(0);
    setResults([]);
  };

  if (!step) {
    const right = results.filter((r) => r.correct).length;
    const pct = Math.round((right / exam.total) * 100);
    const missed = results.filter((r) => !r.correct);
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <div className="glass rounded-3xl p-10 text-center">
          <h1 className="text-3xl font-extrabold">{t("exam.finished")}</h1>
          <p
            className={`mt-3 text-6xl font-extrabold ${
              pct >= 80 ? "text-leaf" : pct >= 50 ? "text-amber" : "text-rose"
            }`}
          >
            {pct}%
          </p>
          <p className="mt-2 text-mist">
            {t("test.score", { n: right, total: exam.total })}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Btn onClick={restart}>{t("exam.again")}</Btn>
            <Link to={back} className="self-center text-sm text-mist underline">
              {t("exam.backToFolder")}
            </Link>
          </div>
        </div>

        {missed.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-xl font-extrabold">{t("exam.review")}</h2>
            <ul className="space-y-2">
              {missed.map(({ card }) => (
                <li key={card.id} className="glass rounded-2xl px-5 py-4">
                  <p className="font-bold">{card.term}</p>
                  <p className="text-sm text-mist">{answerOf(card)}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  const finishStep = (res) => {
    res.forEach(({ card, correct }) =>
      logPractice(card.deck_id, card.id, correct).catch(() => {}),
    );
    setResults((r) => [...r, ...res]);
    setIndex((i) => i + 1);
  };

  const last = index === exam.steps.length - 1;
  const key = `${round}-${index}`;
  const props = { step, onDone: finishStep, last };

  return (
    <div className="mx-auto max-w-2xl">
      {header}
      <div className="mb-1 flex justify-between text-sm text-mist" aria-live="polite">
        <span>
          {t("exam.progress", { n: answered, total: exam.total })}
        </span>
        <span>{t(`exam.type.${step.type}`)}</span>
      </div>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-leaf transition-all"
          style={{ width: `${(answered / exam.total) * 100}%` }}
        />
      </div>

      {step.type === "choice" && <ChoiceQuestion key={key} {...props} />}
      {step.type === "tf" && <TrueFalseQuestion key={key} {...props} />}
      {step.type === "match" && <MatchQuestion key={key} {...props} />}
    </div>
  );
}
