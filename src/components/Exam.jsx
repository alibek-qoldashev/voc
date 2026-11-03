import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { logPractice } from "../lib/api";
import { definitionOnly, levenshtein, normalize, shuffle } from "../lib/utils";
import { load, save } from "../lib/storage";
import { useLang } from "../lib/i18n";
import { Btn, Modal, Select, Toggle, fieldCls } from "./ui";

// Imtihon: deckdagi Exam rejimi va papkadagi "Study all" uchun umumiy.
// Foydalanuvchi oynada savollar soni, javob tomoni va savol turlarini o'zi tanlaydi.

export const EXAM_MIN_WORDS = 4;
export const EXAM_MAX = 200;
export const EXAM_TYPES = ["tf", "choice", "match", "write"];
const ANSWER_WITH = ["term", "definition", "both"];
const MATCH_GROUP = 4;
// To'g'ri javobdan keyin keyingi savolga avtomatik o'tish; xatoda Next tugmasi chiqadi
const NEXT_RIGHT_MS = 800;
const SETUP_KEY = "exam-setup";

const answerOf = definitionOnly;

// Oxirgi tanlangan sozlamalar (savollar sonidan tashqari) eslab qolinadi
export function loadExamSetup(defaultCount, max) {
  const saved = load(SETUP_KEY, {});
  const types = { tf: true, choice: true, match: true, write: false, ...saved.types };
  return {
    count: Math.min(max, Math.max(1, defaultCount)),
    answerWith: ANSWER_WITH.includes(saved.answerWith) ? saved.answerWith : "term",
    types,
  };
}

// count — savollardagi so'zlar soni; answerWith — javobda nima bo'ladi:
// "term" (savolda ta'rif), "definition" (savolda so'z) yoki "both" (aralash)
export function buildExam(cards, { count, answerWith, types }) {
  // Bir xil so'z bir nechta deckda bo'lsa ham bir marta olinadi
  const seen = new Set();
  const unique = shuffle(cards).filter((c) => {
    const k = c.term.trim().toLowerCase();
    return !seen.has(k) && seen.add(k);
  });
  const picked = unique.slice(0, Math.max(1, count));
  // Noto'g'ri variantlar imtihonga tushmagan so'zlardan olinadi va har biri bir marta
  // ishlatiladi, shunda so'z boshqa savolda ko'rinib qolmaydi. Yetmasa takrorlanadi
  const rest = unique.slice(picked.length);
  const used = new Set();
  const decoys = (card, n, ok = () => true) => {
    const fits = (c) => c.id !== card.id && ok(c);
    const out = [];
    for (const list of [rest.filter((c) => !used.has(c.id)), rest, picked]) {
      for (const c of shuffle(list.filter(fits))) {
        if (out.length >= n) break;
        if (!out.includes(c)) out.push(c);
      }
    }
    out.forEach((c) => used.add(c.id));
    return out;
  };
  const dir = () =>
    answerWith === "both"
      ? Math.random() < 0.5
        ? "term"
        : "definition"
      : answerWith;

  let enabled = EXAM_TYPES.filter((t) => types[t]);
  if (!enabled.length) enabled = ["choice"];
  // Test va juftlash uchun kamida 2 ta so'z kerak
  if (unique.length < 2) enabled = ["write"];
  const byType = Object.fromEntries(EXAM_TYPES.map((t) => [t, []]));
  shuffle(picked).forEach((c, i) => byType[enabled[i % enabled.length]].push(c));

  // Juftlashda bitta qolgan so'z boshqa turga o'tadi
  const fallback = enabled.find((t) => t !== "match") || "choice";
  const steps = [];
  for (let i = 0; i < byType.match.length; i += MATCH_GROUP) {
    const group = byType.match.slice(i, i + MATCH_GROUP);
    if (group.length > 1) steps.push({ type: "match", cards: group });
    else byType[fallback].push(...group);
  }
  byType.choice.forEach((card) => {
    const d = dir();
    const others = decoys(card, 3, (c) =>
      d === "term" ? c.term !== card.term : answerOf(c) !== answerOf(card),
    );
    steps.push({
      type: "choice",
      cards: [card],
      dir: d,
      options: shuffle([card, ...others]),
    });
  });
  byType.tf.forEach((card) => {
    const [wrong] = decoys(
      card,
      1,
      (c) => answerOf(c) && answerOf(c) !== answerOf(card),
    );
    const isTrue = !wrong || Math.random() < 0.5;
    steps.push({
      type: "tf",
      cards: [card],
      shown: isTrue ? answerOf(card) : answerOf(wrong),
      isTrue,
    });
  });
  byType.write.forEach((card) =>
    steps.push({ type: "write", cards: [card], dir: dir() }),
  );
  return { steps: shuffle(steps), total: picked.length };
}

// Savol va javob matni yo'nalishga qarab
const askOf = (card, d) => (d === "term" ? answerOf(card) : card.term);
const replyOf = (card, d) => (d === "term" ? card.term : answerOf(card));

// Imtihon sozlamalari oynasi
export function ExamSetup({ max, initial, onStart, onClose }) {
  const { t } = useLang();
  const [count, setCount] = useState(String(initial.count));
  const [answerWith, setAnswerWith] = useState(initial.answerWith);
  const [types, setTypes] = useState(initial.types);
  const n = Math.min(max, Math.max(1, parseInt(count, 10) || 0));
  const anyType = EXAM_TYPES.some((x) => types[x]);

  const start = (e) => {
    e.preventDefault();
    if (!anyType) return;
    save(SETUP_KEY, { answerWith, types });
    onStart({ count: n, answerWith, types });
  };

  return (
    <Modal title={t("exam.setupTitle")} onClose={onClose}>
      <form onSubmit={start}>
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4">
            <span className="font-bold">
              {t("exam.questions")}{" "}
              <span className="font-normal text-mist">
                ({t("exam.max", { n: max })})
              </span>
            </span>
            <input
              type="number"
              min={1}
              max={max}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              onBlur={() => setCount(String(n))}
              className={`${fieldCls} w-24 text-center`}
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="font-bold">{t("exam.answerWith")}</span>
            <Select
              value={answerWith}
              onChange={(e) => setAnswerWith(e.target.value)}
            >
              {ANSWER_WITH.map((a) => (
                <option key={a} value={a}>
                  {t(`exam.answer.${a}`)}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <ul className="mt-6 space-y-5 border-t border-white/10 pt-6">
          {EXAM_TYPES.map((x) => (
            <li key={x} className="flex items-center justify-between gap-3">
              <span className="font-semibold">{t(`exam.type.${x}`)}</span>
              <Toggle
                label={t(`exam.type.${x}`)}
                checked={!!types[x]}
                onChange={(v) => setTypes({ ...types, [x]: v })}
              />
            </li>
          ))}
        </ul>
        {!anyType && (
          <p className="mt-4 text-sm text-rose">{t("exam.pickType")}</p>
        )}

        <div className="mt-8 flex justify-end">
          <Btn type="submit" disabled={!anyType}>
            {t("exam.start")}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function Verdict({ correct, near, children, onNext, last }) {
  const { t } = useLang();
  const next = useRef(onNext);
  next.current = onNext;
  useEffect(() => {
    if (!correct) return;
    const timer = setTimeout(() => next.current(), near ? 1500 : NEXT_RIGHT_MS);
    return () => clearTimeout(timer);
  }, [correct, near]);
  return (
    <div
      role="status"
      className={`mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 ${
        correct ? "border-leaf/50 bg-leaf/10" : "border-rose/50 bg-rose/10"
      }`}
    >
      <div>
        <p className={`font-bold ${correct ? "text-[#8fe36b]" : "text-rose"}`}>
          {correct ? (near ? t("write.nearly") : t("study.correct")) : t("exam.wrong")}
        </p>
        {(!correct || near) && children}
      </div>
      {!correct && (
        <Btn autoFocus onClick={onNext}>
          {last ? t("test.seeScore") : t("test.next")}
        </Btn>
      )}
    </div>
  );
}

function ChoiceQuestion({ step, onDone, last }) {
  const { t } = useLang();
  const card = step.cards[0];
  const d = step.dir;
  const [picked, setPicked] = useState(null);
  const correct = picked === card.id;

  return (
    <>
      <section className="glass rounded-3xl p-7">
        <p className="text-sm text-mist">
          {t(d === "term" ? "test.question" : "test.questionTerm")}
        </p>
        <p className="mt-2 text-2xl font-bold leading-snug">{askOf(card, d)}</p>
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
                className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                  d === "term" ? "font-bold" : "font-medium leading-snug"
                } ${
                  isAnswer
                    ? "border-leaf bg-leaf/15 text-[#8fe36b]"
                    : isWrongPick
                      ? "border-rose bg-rose/10 text-rose"
                      : "glass hover:border-white/40 disabled:opacity-60"
                }`}
              >
                {replyOf(o, d)}
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
            {t("write.answerIs")}{" "}
            <span className="font-bold">{replyOf(card, d)}</span>
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

// Yozma: so'z yoki ta'rifni o'zi yozadi. Ta'rif uzun bo'lgani uchun biroz xatoga ruxsat
function WriteQuestion({ step, onDone, last }) {
  const { t } = useLang();
  const card = step.cards[0];
  const d = step.dir;
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const check = (e) => {
    e.preventDefault();
    if (result || !answer.trim()) return;
    const given = normalize(answer);
    const want = normalize(replyOf(card, d));
    const exact = given === want;
    const allowed = d === "term" ? (want.length >= 5 ? 1 : 0) : Math.floor(want.length * 0.15);
    const near = !exact && allowed > 0 && levenshtein(given, want) <= allowed;
    setResult({ correct: exact || near, near });
  };

  return (
    <>
      <section className="glass rounded-3xl p-7">
        <p className="text-sm text-mist">
          {t(d === "term" ? "write.prompt" : "exam.writeDef")}
        </p>
        <p className="mt-2 text-2xl font-bold leading-snug">{askOf(card, d)}</p>
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
        <Verdict
          correct={result.correct}
          near={result.near}
          last={last}
          onNext={() => onDone([{ card, correct: result.correct }])}
        >
          <p className="mt-1">
            {t("write.answerIs")}{" "}
            <span className="font-bold">{replyOf(card, d)}</span>
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
      <p className="mb-3 text-sm text-mist">{t("exam.matchPrompt")}</p>
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

// Imtihonni o'tkazish va natija. back/backLabel — natijadagi qaytish havolasi
export function ExamRunner({ cards, config, back, backLabel, onSettings, header }) {
  const { t } = useLang();
  const [exam, setExam] = useState(() => buildExam(cards, config));
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [round, setRound] = useState(0);

  const step = exam.steps[index];
  const answered = results.length;

  const restart = () => {
    setExam(buildExam(cards, config));
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
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Btn onClick={restart}>{t("exam.again")}</Btn>
            <Btn variant="glass" onClick={onSettings}>
              {t("exam.changeSettings")}
            </Btn>
            <Link to={back} className="text-sm text-mist underline">
              {backLabel}
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
        <span>{t("exam.progress", { n: answered, total: exam.total })}</span>
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
      {step.type === "write" && <WriteQuestion key={key} {...props} />}
    </div>
  );
}
