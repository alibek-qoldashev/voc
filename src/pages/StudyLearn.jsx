import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCards, logPractice } from "../lib/api";
import { definitionOnly, levenshtein, normalize, shuffle } from "../lib/utils";
import { QUESTION_TYPES, useStudy } from "../lib/study";
import { useLang } from "../lib/i18n";
import { studyBack } from "../lib/decks";
import { Btn, ErrorBox, Spinner, fieldCls, backLinkCls } from "../components/ui";

const ROUND_SIZE = 7;
// Xato topilgan karta raund ichida shuncha savoldan keyin yana chiqadi
const RETRY_GAP = 3;

// Learn da faqat inglizcha ta'rif ko'rsatiladi (chiziqchadan keyingi tarjimasiz)
const answerOf = definitionOnly;

// To'g'ri javobdan keyin keyingi savolga avtomatik o'tish. Imlo xatosi bilan
// qabul qilinganda to'g'ri yozilishini o'qishga ko'proq vaqt. Xatoda Continue tugmasi chiqadi
const NEXT_RIGHT_MS = 800;
const NEXT_NEAR_MS = 1500;

// Karta holati: 0 — hali o'rganilmagan, oxirgi bosqichdan o'tsa — o'zlashtirilgan
const statusOf = (level, done) =>
  level >= done ? "mastered" : level > 0 ? "familiar" : "new";

const STATUS_CLS = {
  new: "bg-white/10 text-mist",
  familiar: "bg-amber/15 text-amber",
  mastered: "bg-leaf/15 text-[#8fe36b]",
};

// Raund: o'zlashtirilmagan kartalardan bir guruh, avval ko'p xato qilinganlari.
// Har karta o'z bosqichidagi savol bilan chiqadi (avval test, keyin yozma)
function buildRound(cards, levels, done, misses, order) {
  const pending = order(cards.filter((c) => levels[c.id] < done));
  pending.sort((a, b) => (misses[b.id] || 0) - (misses[a.id] || 0));
  return pending.slice(0, ROUND_SIZE).map((c) => c.id);
}

function Feedback({ correct, card, near, onNext }) {
  const { t } = useLang();
  const next = useRef(onNext);
  next.current = onNext;
  useEffect(() => {
    if (!correct) return;
    const timer = setTimeout(
      () => next.current(),
      near ? NEXT_NEAR_MS : NEXT_RIGHT_MS,
    );
    return () => clearTimeout(timer);
  }, [correct, near]);
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
      {!correct && (
        <Btn autoFocus onClick={onNext}>
          {t("common.continue")}
        </Btn>
      )}
    </div>
  );
}

// Test: ta'rifga mos so'zni 4 ta variantdan tanlash
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
      <ul className="mt-5 grid auto-rows-fr gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const isAnswer = picked && o.id === card.id;
          const isWrongPick = picked === o.id && o.id !== card.id;
          return (
            <li key={o.id} className="flex">
              <button
                type="button"
                disabled={!!picked}
                onClick={() => setPicked(o.id)}
                className={`flex min-h-[4.5rem] w-full items-center rounded-2xl border px-4 py-4 text-left font-bold transition-colors ${
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
          onNext={() => onDone({ id: card.id, correct })}
        />
      )}
    </>
  );
}

// Yozma: ta'rifni o'qib so'zni o'zi yozadi
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
          onNext={() => onDone({ id: card.id, correct: result.correct })}
        />
      )}
    </>
  );
}

// Hali o'rganilmagan / tanish / o'zlashtirilgan kartalar soni
function StatusBar({ counts }) {
  const { t } = useLang();
  return (
    <div className="mt-5 grid grid-cols-3 gap-2 text-center">
      {["new", "familiar", "mastered"].map((st) => (
        <div key={st} className={`rounded-2xl px-2 py-3 ${STATUS_CLS[st]}`}>
          <p className="text-2xl font-extrabold">{counts[st]}</p>
          <p className="text-xs font-semibold">{t(`learn.status.${st}`)}</p>
        </div>
      ))}
    </div>
  );
}

// Raund natijasi: shu raunddagi kartalar va ularning yangi holati
function RoundSummary({ round, ids, firstTry, cardsById, levels, done, counts, onNext }) {
  const { t } = useLang();
  const right = ids.filter((id) => firstTry[id]).length;
  return (
    <div className="mx-auto max-w-xl">
      <div className="glass rounded-3xl p-8">
        <h1 className="text-2xl font-extrabold">
          {t("learn.roundDone", { n: round })}
        </h1>
        <p className="mt-2 text-mist">
          {t("learn.roundScore", { n: right, total: ids.length })}
        </p>
        <StatusBar counts={counts} />
        <ul className="mt-6 divide-y divide-white/10">
          {ids.map((id) => {
            const c = cardsById[id];
            const st = statusOf(levels[id], done);
            return (
              <li key={id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-bold">{c.term}</span>
                  <span className="block truncate text-sm text-mist">
                    {answerOf(c)}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLS[st]}`}
                >
                  {t(`learn.status.${st}`)}
                </span>
              </li>
            );
          })}
        </ul>
        <Btn autoFocus className="mt-6 w-full py-4 text-base" onClick={onNext}>
          {counts.mastered === Object.keys(levels).length
            ? t("common.continue")
            : t("learn.nextRound", { n: round + 1 })}
        </Btn>
      </div>
    </div>
  );
}

export default function StudyLearn() {
  const { deckId } = useParams();
  const [cards, setCards] = useState(null);
  const [levels, setLevels] = useState({});
  const [misses, setMisses] = useState({});
  // Joriy raund: savollar navbati (xatolar qayta qo'shiladi), raund kartalari va birinchi urinish natijasi
  const [queue, setQueue] = useState([]);
  const [pos, setPos] = useState(0);
  const [roundIds, setRoundIds] = useState([]);
  const [firstTry, setFirstTry] = useState({});
  const [round, setRound] = useState(1);
  const [summary, setSummary] = useState(false);
  const { settings, filter, order } = useStudy();
  const { t } = useLang();
  // Bosqichlar: test, keyin yozma (sozlamalarda o'chirilgani tushib qoladi)
  const enabled = QUESTION_TYPES.filter((q) => settings.types[q.id]).map(
    (q) => q.id,
  );
  const stages = enabled.length ? enabled : QUESTION_TYPES.map((q) => q.id);
  const DONE = stages.length;
  const [error, setError] = useState("");

  const beginRound = (cs, lv, ms) => {
    const ids = buildRound(cs, lv, DONE, ms, order);
    setQueue(ids);
    setRoundIds(ids);
    setPos(0);
    setFirstTry({});
    setSummary(false);
  };

  const start = (cs) => {
    const fresh = Object.fromEntries(cs.map((c) => [c.id, 0]));
    setLevels(fresh);
    setMisses({});
    setRound(1);
    beginRound(cs, fresh, {});
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

  const { to: back, label: backLabel } = studyBack(deckId);

  if (cards.length === 0) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <p className="text-xl font-bold">{t("learn.noCards")}</p>
        <Link to={back} className={`${backLinkCls} mt-5`}>
          {t(backLabel)}
        </Link>
      </div>
    );
  }

  const cardsById = Object.fromEntries(cards.map((c) => [c.id, c]));
  const counts = { new: 0, familiar: 0, mastered: 0 };
  cards.forEach((c) => counts[statusOf(levels[c.id] ?? 0, DONE)]++);
  const progress =
    cards.reduce((s, c) => s + Math.min(levels[c.id] ?? 0, DONE), 0) /
    (cards.length * DONE);
  const allMastered = counts.mastered === cards.length;

  if (summary) {
    return (
      <RoundSummary
        round={round}
        ids={roundIds}
        firstTry={firstTry}
        cardsById={cardsById}
        levels={levels}
        done={DONE}
        counts={counts}
        onNext={() => {
          if (allMastered) return setSummary(false);
          setRound((r) => r + 1);
          beginRound(cards, levels, misses);
        }}
      />
    );
  }

  if (allMastered) {
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
            <Link to={back} className={backLinkCls}>
              {t(backLabel)}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const card = cardsById[queue[pos]];
  const level = levels[card.id];
  // Test uchun kamida 2 ta karta kerak, aks holda yozma savol
  let type = stages[Math.min(level, DONE - 1)];
  if (type === "choice" && cards.length < 2) type = "write";

  // To'g'ri — karta keyingi bosqichga o'tadi; xato — shu raundda bir oz keyin qayta chiqadi
  const finishStep = ({ id, correct }) => {
    logPractice(cardsById[id].deck_id, id, correct).catch(() => {});
    if (!(id in firstTry)) setFirstTry((f) => ({ ...f, [id]: correct }));
    let q = queue;
    if (correct) {
      setLevels((lv) => ({ ...lv, [id]: lv[id] + 1 }));
    } else {
      setMisses((m) => ({ ...m, [id]: (m[id] || 0) + 1 }));
      q = [...queue];
      q.splice(Math.min(pos + 1 + RETRY_GAP, q.length), 0, id);
      setQueue(q);
    }
    if (pos + 1 < q.length) return setPos(pos + 1);
    setSummary(true);
  };

  const key = `${round}-${pos}`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-end gap-3">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-mist">
          {t("learn.round", { n: round })} · {pos + 1} / {queue.length} ·{" "}
          {t(`qtype.${type}`)}
        </span>
      </div>

      <div
        className="mb-1 flex justify-between text-sm text-mist"
        aria-live="polite"
      >
        <span>
          {t("learn.mastered", { n: counts.mastered, total: cards.length })}
        </span>
        <span>{Math.round(progress * 100)}%</span>
      </div>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-leaf transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {type === "choice" ? (
        <ChoiceStep key={key} card={card} all={cards} onDone={finishStep} />
      ) : (
        <WriteStep key={key} card={card} onDone={finishStep} />
      )}
    </div>
  );
}
