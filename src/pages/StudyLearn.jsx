import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCards, logPractice } from "../lib/api";
import { levenshtein, normalize, shuffle, speak } from "../lib/utils";
import { QUESTION_TYPES, useStudy } from "../lib/study";
import { useLang } from "../lib/i18n";
import {
  Btn,
  CardImage,
  ErrorBox,
  Spinner,
  SpeakIcon,
  fieldCls,
} from "../components/ui";

const ROUND_SIZE = 7;

const answerOf = (c) => c.definition || c.translation;

// Bir raund: hali o'rganilmagan so'zlardan bir nechtasi, har biri o'z bosqichida.
// stages — sozlamalarda yoqilgan savol turlari; hammasidan o'tgan so'z o'rganilgan hisoblanadi
function buildRound(cards, levels, stages, order) {
  const done = stages.length;
  const pending = order(cards.filter((c) => levels[c.id] < done)).slice(
    0,
    ROUND_SIZE,
  );
  const canChoose = cards.length >= 2;
  const single = (type, card, to) => ({ type, cards: [card], to });
  const steps = [];

  stages.forEach((type, lvl) => {
    const group = pending.filter((c) => levels[c.id] === lvl);
    if (type === "match" && group.length >= 2) {
      steps.push({ type: "match", cards: group, to: lvl + 1 });
      return;
    }
    // Test yoki Match uchun so'z yetmasa, o'rniga boshqa tur
    let t = type;
    if (t === "match") t = canChoose ? "choice" : "write";
    if (t === "choice" && !canChoose) t = "write";
    group.forEach((c) => steps.push(single(t, c, lvl + 1)));
  });
  return steps;
}

function Feedback({ correct, card, near, onNext }) {
  const { t } = useLang();
  return (
    <div
      role="status"
      className={`mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 ${correct ? "border-leaf/50 bg-leaf/10" : "border-rose/50 bg-rose/10"}`}
    >
      <div>
        <p className={`font-bold ${correct ? "text-[#8fe36b]" : "text-rose"}`}>
          {correct
            ? near
              ? t("write.nearly")
              : t("study.correct")
            : t("learn.wrong")}
        </p>
        {(!correct || near) && (
          <p className="mt-1">
            {t("write.answerIs")}{" "}
            <span className="text-xl font-bold">{card.term}</span>
          </p>
        )}
      </div>
      <Btn autoFocus onClick={onNext}>
        {t("common.continue")}
      </Btn>
    </div>
  );
}

// Anki: kartani aylantirib, bilganini o'zi belgilaydi
function FlipStep({ card, onDone }) {
  const { say } = useStudy();
  const { t } = useLang();
  useEffect(() => {
    say(card.term);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [flipped, setFlipped] = useState(false);
  return (
    <>
      <p className="mb-3 text-sm text-mist">{t("learn.doYouKnow")}</p>
      <div
        className={`flip cursor-pointer ${flipped ? "is-flipped" : ""}`}
        onClick={() => setFlipped(true)}
      >
        <div className="flip-inner relative h-[18rem] sm:h-[22rem]">
          <div className="face glass absolute inset-0 flex flex-col items-center justify-center rounded-3xl px-8 text-center">
            <CardImage src={card.term_image} />
            <p className="text-4xl font-semibold sm:text-5xl">{card.term}</p>
          </div>
          <div className="face face-back glass absolute inset-0 flex flex-col items-center justify-center rounded-3xl px-8 text-center">
            <CardImage src={card.definition_image} />
            {card.translation && (
              <p className="text-3xl font-extrabold text-[#8fe36b]">
                {card.translation}
              </p>
            )}
            {card.definition && (
              <p className="mt-3 text-2xl leading-snug">{card.definition}</p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-center">
        <Btn variant="glass" onClick={() => speak(card.term)}>
          <SpeakIcon /> {t("common.listen")}
        </Btn>
      </div>
      {flipped ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onDone([{ id: card.id, correct: false }])}
            className="rounded-2xl border border-rose/50 bg-white/5 py-4 font-bold text-rose hover:bg-rose/10"
          >
            {t("learn.didntKnow")}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => onDone([{ id: card.id, correct: true }])}
            className="rounded-2xl border border-leaf/60 bg-white/5 py-4 font-bold text-[#8fe36b] hover:bg-leaf/15"
          >
            {t("learn.knew")}
          </button>
        </div>
      ) : (
        <Btn className="mt-5 w-full py-4 text-base" onClick={() => setFlipped(true)}>
          {t("keys.showAnswer")}
        </Btn>
      )}
    </>
  );
}

// Test: ta'rifga mos so'zni tanlash
function ChoiceStep({ card, all, onDone }) {
  const { say } = useStudy();
  const { t } = useLang();
  useEffect(() => {
    say(answerOf(card));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [options] = useState(() =>
    shuffle([card, ...shuffle(all.filter((c) => c.id !== card.id)).slice(0, 3)]),
  );
  const [picked, setPicked] = useState(null);
  const correct = picked === card.id;

  return (
    <>
      <section className="glass rounded-3xl p-7">
        <p className="text-sm text-mist">{t("learn.choose")}</p>
        <p className="mt-2 text-2xl font-bold leading-snug">{answerOf(card)}</p>
      </section>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {options.map((o) => {
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
        <Feedback
          correct={correct}
          card={card}
          onNext={() => onDone([{ id: card.id, correct }])}
        />
      )}
    </>
  );
}

// Writing: ta'rifni o'qib so'zni yozish
function WriteStep({ card, onDone }) {
  const { say } = useStudy();
  const { t } = useLang();
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    say(answerOf(card));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const check = (e) => {
    e.preventDefault();
    if (result || !answer.trim()) return;
    const given = normalize(answer);
    const want = normalize(card.term);
    const exact = given === want;
    const near = !exact && want.length >= 5 && levenshtein(given, want) === 1;
    setResult({ correct: exact || near, near });
  };

  return (
    <>
      <section className="glass rounded-3xl p-7">
        <p className="text-sm text-mist">{t("write.prompt")}</p>
        <p className="mt-2 text-2xl font-bold leading-snug">{answerOf(card)}</p>
      </section>
      <form onSubmit={check} className="mt-5 flex flex-wrap gap-3">
        <input
          ref={inputRef}
          disabled={!!result}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className={`${fieldCls} min-w-0 flex-1 text-base`}
          placeholder={t("write.answer")}
          aria-label={t("write.answer")}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <Btn type="submit" disabled={!!result || !answer.trim()}>
          {t("write.check")}
        </Btn>
      </form>
      {result && (
        <Feedback
          correct={result.correct}
          near={result.near}
          card={card}
          onNext={() => onDone([{ id: card.id, correct: result.correct }])}
        />
      )}
    </>
  );
}

// Match: so'zlarni ta'riflari bilan juftlash. Birinchi urinishda topilganlar o'tadi
function MatchStep({ cards, onDone }) {
  const { t } = useLang();
  const [tiles] = useState(() =>
    shuffle(
      cards.flatMap((c) => [
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

    const first = tiles.find((t) => t.key === selected);
    setSelected(null);
    if (first.pair === tile.pair) {
      const next = new Set(matched).add(tile.pair);
      setMatched(next);
      if (next.size === cards.length) {
        setTimeout(
          () =>
            onDone(cards.map((c) => ({ id: c.id, correct: !missed.has(c.id) }))),
          400,
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
      <p className="mb-3 text-sm text-mist">
        {t("learn.matchPrompt")}
      </p>
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
                className={`flex min-h-24 w-full items-center justify-center rounded-2xl border px-3 py-3 text-center transition-colors ${
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
    </>
  );
}

export default function StudyLearn() {
  const { deckId } = useParams();
  const [cards, setCards] = useState(null);
  const [levels, setLevels] = useState({});
  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [round, setRound] = useState(1);
  const { settings, filter, order } = useStudy();
  const { t } = useLang();
  const stages = QUESTION_TYPES.filter((t) => settings.types[t.id]).map(
    (t) => t.id,
  );
  const DONE = stages.length;
  const [error, setError] = useState("");

  const start = (cs) => {
    const fresh = Object.fromEntries(cs.map((c) => [c.id, 0]));
    setLevels(fresh);
    setSteps(buildRound(cs, fresh, stages, order));
    setStepIdx(0);
    setRound(1);
  };

  useEffect(() => {
    getCards(deckId)
      .then((cs) => {
        const usable = filter(cs).filter(answerOf);
        setCards(usable);
        start(usable);
      })
      .catch((e) => setError(e.message));
  }, [deckId]);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!cards) return <Spinner label={t("learn.preparing")} />;

  const back = `/flashcards/deck/${deckId}`;

  if (cards.length === 0) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <p className="text-xl font-bold">{t("learn.noCards")}</p>
        <Link to={back} className="mt-5 inline-block text-leaf underline">
          {t("study.backToDeck")}
        </Link>
      </div>
    );
  }

  const learned = cards.filter((c) => levels[c.id] >= DONE).length;
  const progress =
    cards.reduce((s, c) => s + Math.min(levels[c.id] ?? 0, DONE), 0) /
    (cards.length * DONE);
  const step = steps[stepIdx];

  // Javoblardan keyin bosqichlarni yangilab, keyingi qadamga o'tamiz
  const finishStep = (results) => {
    const next = { ...levels };
    results.forEach(({ id, correct }) => {
      if (correct) next[id] = Math.max(next[id], step.to);
      logPractice(deckId, id, correct).catch(() => {});
    });
    setLevels(next);
    if (stepIdx + 1 < steps.length) return setStepIdx(stepIdx + 1);
    if (cards.every((c) => next[c.id] >= DONE)) return setSteps([]);
    setSteps(buildRound(cards, next, stages, order));
    setStepIdx(0);
    setRound((r) => r + 1);
  };

  if (!step) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="glass rounded-3xl p-10 text-center">
          <h1 className="text-3xl font-extrabold">{t("learn.allLearned")}</h1>
          <p className="mt-3 text-mist">
            {t("learn.summary", { count: cards.length })}{" "}
            {t("learn.rounds", { count: round })}
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Btn onClick={() => start(cards)}>{t("learn.again")}</Btn>
            <Link to={back} className="self-center text-sm text-mist underline">
              {t("study.backToDeck")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const key = `${round}-${stepIdx}`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-end gap-3">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-mist">
          {t("learn.round", { n: round })} · {t(`qtype.${step.type}`)}
        </span>
      </div>

      <div
        className="mb-1 flex justify-between text-sm text-mist"
        aria-live="polite"
      >
        <span>
          {t("learn.learned", { n: learned, total: cards.length })}
        </span>
        <span>{Math.round(progress * 100)}%</span>
      </div>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-leaf transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {step.type === "flip" && (
        <FlipStep key={key} card={step.cards[0]} onDone={finishStep} />
      )}
      {step.type === "choice" && (
        <ChoiceStep
          key={key}
          card={step.cards[0]}
          all={cards}
          onDone={finishStep}
        />
      )}
      {step.type === "write" && (
        <WriteStep key={key} card={step.cards[0]} onDone={finishStep} />
      )}
      {step.type === "match" && (
        <MatchStep key={key} cards={step.cards} onDone={finishStep} />
      )}
    </div>
  );
}
