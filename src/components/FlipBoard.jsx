import { useEffect, useRef, useState } from "react";
import { shuffle, speak } from "../lib/utils";
import { load, save } from "../lib/storage";
import { useLang } from "../lib/i18n";
import {
  Btn,
  CardImage,
  Field,
  Icon,
  Modal,
  Select,
  SpeakIcon,
  Toggle,
  fieldCls,
} from "./ui";

const AUTOPLAY_MS = 3000;
const SETTINGS_KEY = "flipboard-settings";
const DEFAULTS = { track: false, starredOnly: false, front: "term", tts: false };

const ICONS = {
  prev: ["M19 12H5", "m12 19-7-7 7-7"],
  next: ["M5 12h14", "m12 5 7 7-7 7"],
  play: ["M7 4v16l13-8z"],
  pause: ["M8 5v14", "M16 5v14"],
  shuffle: ["M16 3h5v5", "M4 20 21 3", "M21 16v5h-5", "m15 15 6 6", "M4 4l5 5"],
  expand: [
    "M8 3H5a2 2 0 0 0-2 2v3",
    "M21 8V5a2 2 0 0 0-2-2h-3",
    "M3 16v3a2 2 0 0 0 2 2h3",
    "M16 21h3a2 2 0 0 0 2-2v-3",
  ],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"],
  star: ["m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"],
  gear: [
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  ],
  close: ["M18 6 6 18", "m6 6 12 12"],
  check: ["M20 6 9 17l-5-5"],
  chevron: ["m6 9 6 6 6-6"],
};

const SHORTCUTS = [
  ["Space", "board.keyFlip"],
  ["→", "board.keyNext"],
  ["←", "board.keyPrev"],
];

const roundBtn =
  "flex h-12 w-12 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40";
const iconBtn =
  "rounded-full p-2.5 text-mist transition-colors hover:bg-white/10 hover:text-white";

// Faqat boardda turgan so'zni tahrirlash
function EditCard({ card, onSave, onClose }) {
  const [term, setTerm] = useState(card.term);
  const [definition, setDefinition] = useState(card.definition || "");
  const [busy, setBusy] = useState(false);
  const { t } = useLang();

  const submit = async (e) => {
    e.preventDefault();
    if (!term.trim() || busy) return;
    setBusy(true);
    await onSave({ ...card, term, definition });
    setBusy(false);
    onClose();
  };

  return (
    <Modal title={t("board.editCard")} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label={t("card.term")}>
          <input
            autoFocus
            className={fieldCls}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </Field>
        <Field label={t("card.definition")}>
          <input
            className={fieldCls}
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
          />
        </Field>
        <div className="mt-2 flex gap-3">
          <Btn type="submit" disabled={!term.trim() || busy}>
            {busy ? t("common.saving") : t("common.save")}
          </Btn>
          <Btn variant="glass" onClick={onClose}>
            {t("common.cancel")}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function Options({ settings, set, onRestart, onClose }) {
  const [showKeys, setShowKeys] = useState(false);
  const { t } = useLang();
  const row = "flex items-center justify-between gap-4";
  return (
    <Modal title={t("board.options")} onClose={onClose}>
      <div className={row}>
        <p className="text-lg font-bold">{t("board.track")}</p>
        <Toggle
          label={t("board.track")}
          checked={settings.track}
          onChange={(v) => set({ track: v })}
        />
      </div>
      <p className="mt-2 text-sm text-mist">
        {t("board.trackHint")}
      </p>

      <div className={`${row} mt-7`}>
        <p className="text-lg font-bold">{t("study.starredOnly")}</p>
        <Toggle
          label={t("study.starredOnly")}
          checked={settings.starredOnly}
          onChange={(v) => set({ starredOnly: v })}
        />
      </div>

      <div className={`${row} mt-7`}>
        <label htmlFor="front-side" className="text-lg font-bold">
          {t("board.front")}
        </label>
        <Select
          id="front-side"
          value={settings.front}
          onChange={(e) => set({ front: e.target.value })}
        >
          <option value="term">{t("card.term")}</option>
          <option value="definition">{t("card.definition")}</option>
        </Select>
      </div>

      <div className="mt-7 border-t border-white/10 pt-6">
        <div className={row}>
          <p className="text-lg font-bold">{t("study.shortcuts")}</p>
          <button
            type="button"
            onClick={() => setShowKeys((v) => !v)}
            aria-expanded={showKeys}
            className="flex items-center gap-1 font-bold text-sky"
          >
            {showKeys ? t("board.hide") : t("board.view")}
            <span className={showKeys ? "rotate-180" : ""}>
              <Icon d={ICONS.chevron} size={20} />
            </span>
          </button>
        </div>
        {showKeys && (
          <dl className="mt-4 space-y-2">
            {SHORTCUTS.map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 text-sm">
                <dt className="min-w-16 rounded-lg bg-white/10 px-2 py-1 text-center font-bold">
                  {k}
                </dt>
                <dd className="text-mist">{t(v)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className={`${row} mt-6 border-t border-white/10 pt-6`}>
        <p className="text-lg font-bold">{t("study.tts")}</p>
        <Toggle
          label={t("study.tts")}
          checked={settings.tts}
          onChange={(v) => set({ tts: v })}
        />
      </div>

      <div className="mt-6 border-t border-white/10 pt-6">
        <button
          type="button"
          onClick={() => {
            onRestart();
            onClose();
          }}
          className="text-lg font-bold text-rose hover:underline"
        >
          {t("board.restart")}
        </button>
      </div>
    </Modal>
  );
}

// Deck sahifasidagi katta aylanadigan karta (Quizlet uslubida)
export default function FlipBoard({ deckId, cards, onSave }) {
  const [settings, setSettings] = useState(() => ({
    ...DEFAULTS,
    ...load(SETTINGS_KEY, {}),
  }));
  const [starred, setStarred] = useState(
    () => new Set(load(`starred:${deckId}`, [])),
  );
  const pool = settings.starredOnly
    ? cards.filter((c) => starred.has(c.id))
    : cards;
  const poolKey = pool.map((c) => c.id).join(",");

  const [order, setOrder] = useState(() => pool.map((c) => c.id));
  const [shuffled, setShuffled] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [known, setKnown] = useState(() => new Set());
  const [learning, setLearning] = useState(() => new Set());
  const [finished, setFinished] = useState(false);
  const [modal, setModal] = useState(null); // "options" | "edit"
  const { t } = useLang();
  const boxRef = useRef(null);

  // Kartalar qo'shilsa, o'chirilsa yoki filtr o'zgarsa tartibni moslaymiz
  useEffect(() => {
    setOrder((o) => {
      const ids = poolKey ? poolKey.split(",") : [];
      const kept = o.filter((id) => ids.includes(id));
      return [...kept, ...ids.filter((id) => !kept.includes(id))];
    });
  }, [poolKey]);

  const total = order.length;
  const safeIndex = Math.min(index, Math.max(0, total - 1));
  const card = cards.find((c) => c.id === order[safeIndex]);
  const termFirst = settings.front === "term";

  const set = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    save(SETTINGS_KEY, next);
    if ("starredOnly" in patch || "track" in patch) restart();
    if ("front" in patch) setFlipped(false);
  };

  const restart = () => {
    setIndex(0);
    setFlipped(false);
    setPlaying(false);
    setKnown(new Set());
    setLearning(new Set());
    setFinished(false);
  };

  // Restart Flashcards: hamma kartalar, asl tartibda
  const fullRestart = () => {
    setOrder(pool.map((c) => c.id));
    setShuffled(false);
    restart();
  };

  const toggleStar = () => {
    const next = new Set(starred);
    next.has(card.id) ? next.delete(card.id) : next.add(card.id);
    setStarred(next);
    save(`starred:${deckId}`, [...next]);
  };

  const go = (step) => {
    setFlipped(false);
    setIndex((i) => Math.min(Math.max(0, i + step), total - 1));
  };

  // Track progress: Know / Still learning deb belgilab keyingisiga o'tish
  const sort = (knew) => {
    const add = (s) => new Set(s).add(card.id);
    const remove = (s) => {
      const n = new Set(s);
      n.delete(card.id);
      return n;
    };
    setKnown((s) => (knew ? add(s) : remove(s)));
    setLearning((s) => (knew ? remove(s) : add(s)));
    setFlipped(false);
    if (safeIndex >= total - 1) setFinished(true);
    else setIndex(safeIndex + 1);
  };

  const reviewLearning = () => {
    setOrder(order.filter((id) => learning.has(id)));
    setKnown(new Set());
    setLearning(new Set());
    setIndex(0);
    setFinished(false);
  };

  const toggleShuffle = () => {
    setOrder(shuffled ? pool.map((c) => c.id) : shuffle(order));
    setShuffled((s) => !s);
    restart();
  };

  // Avtomatik: avval aylantiradi, keyin keyingi kartaga o'tadi
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (!flipped) return setFlipped(true);
      if (safeIndex >= total - 1) return setPlaying(false);
      setFlipped(false);
      setIndex((i) => i + 1);
    }, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [playing, flipped, safeIndex, total]);

  // Text to speech: ko'rinib turgan tomonni o'qiydi
  useEffect(() => {
    if (!settings.tts || !card || finished) return;
    const showTerm = flipped !== termFirst;
    speak(showTerm ? card.term : card.definition || card.translation || "");
  }, [settings.tts, card?.id, flipped, termFirst, finished]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (modal || finished || !card) return;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight") settings.track ? sort(true) : go(1);
      else if (e.key === "ArrowLeft") settings.track ? sort(false) : go(-1);
      else if (e.key === " " && tag !== "BUTTON") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else boxRef.current?.requestFullscreen?.();
  };

  const termFace = (
    <>
      <CardImage src={card?.term_image} />
      <p className="text-4xl font-semibold sm:text-6xl">{card?.term}</p>
    </>
  );
  const defFace = card && (
    <>
      <CardImage src={card.definition_image} />
      {card.translation && (
        <p className="text-3xl font-extrabold text-[#8fe36b]">
          {card.translation}
        </p>
      )}
      {card.definition && (
        <p className="mt-3 max-w-2xl text-2xl leading-snug sm:text-3xl">
          {card.definition}
        </p>
      )}
    </>
  );

  const stopClick = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };

  let board;
  if (!card) {
    board = (
      <div className="glass flex h-[20rem] flex-col items-center justify-center rounded-3xl px-8 text-center sm:h-[26rem]">
        <p className="text-2xl font-bold">{t("board.noStarred")}</p>
        <p className="mt-2 text-mist">
          {t("board.noStarredHint")}
        </p>
        <Btn
          variant="glass"
          className="mt-6"
          onClick={() => set({ starredOnly: false })}
        >
          {t("study.allTerms")}
        </Btn>
      </div>
    );
  } else if (finished) {
    board = (
      <div className="glass flex h-[20rem] flex-col items-center justify-center rounded-3xl px-8 text-center sm:h-[26rem]">
        <p className="text-3xl font-extrabold">
          {learning.size ? t("board.keepGoing") : t("board.knowAll")}
        </p>
        <div className="mt-6 flex gap-8">
          <div>
            <p className="text-4xl font-extrabold text-[#8fe36b]">
              {known.size}
            </p>
            <p className="text-sm text-mist">{t("board.know")}</p>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-amber">
              {learning.size}
            </p>
            <p className="text-sm text-mist">{t("board.learning")}</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {learning.size > 0 && (
            <Btn onClick={reviewLearning}>
              {t("board.reviewLearning", { n: learning.size })}
            </Btn>
          )}
          <Btn variant="glass" onClick={fullRestart}>
            {t("board.restart")}
          </Btn>
        </div>
      </div>
    );
  } else {
    const isStarred = starred.has(card.id);
    board = (
      <div className="relative">
        <div
          className={`flip cursor-pointer ${flipped ? "is-flipped" : ""}`}
          onClick={() => setFlipped((f) => !f)}
        >
          <div className="flip-inner relative h-[20rem] sm:h-[26rem]">
            <div className="face glass absolute inset-0 flex flex-col items-center justify-center rounded-3xl px-8 text-center">
              {termFirst ? termFace : defFace}
            </div>
            <div className="face face-back glass absolute inset-0 flex flex-col items-center justify-center rounded-3xl px-8 text-center">
              {termFirst ? defFace : termFace}
              {card.example && (
                <p className="mt-6 max-w-xl text-base italic text-mist">
                  {card.example}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="absolute right-4 top-4 z-10 flex gap-1">
          <button
            type="button"
            onClick={stopClick(() => setModal("edit"))}
            aria-label={t("board.editTerm", { term: card.term })}
            className={iconBtn}
          >
            <Icon d={ICONS.edit} size={20} />
          </button>
          <button
            type="button"
            onClick={stopClick(() => speak(card.term))}
            aria-label={t("common.listenTo", { term: card.term })}
            className={iconBtn}
          >
            <SpeakIcon />
          </button>
          <button
            type="button"
            onClick={stopClick(toggleStar)}
            aria-label={isStarred ? t("board.unstar") : t("board.star")}
            aria-pressed={isStarred}
            className={`${iconBtn} ${isStarred ? "!text-amber" : ""}`}
          >
            <Icon
              d={ICONS.star}
              size={20}
              fill={isStarred ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>
    );
  }

  const showNav = card && !finished;

  return (
    <section
      ref={boxRef}
      className="flex flex-col bg-night [&:fullscreen]:justify-center [&:fullscreen]:p-8"
    >
      {board}

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {!settings.track && (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              disabled={!showNav}
              aria-label={playing ? t("board.pause") : t("board.autoplay")}
              aria-pressed={playing}
              className={`${roundBtn} ${playing ? "bg-leaf text-night" : "bg-white/10 hover:bg-white/15"}`}
            >
              <Icon d={playing ? ICONS.pause : ICONS.play} size={20} />
            </button>
          )}
          {settings.track && showNav && (
            <span className="self-center text-sm text-mist">
              <span className="font-bold text-amber">{learning.size}</span>{" "}
              {t("board.learning").toLowerCase()} ·{" "}
              <span className="font-bold text-[#8fe36b]">{known.size}</span>{" "}
              {t("board.know").toLowerCase()}
            </span>
          )}
        </div>

        {showNav && (
          <div className="flex items-center gap-3 sm:gap-5">
            <button
              type="button"
              onClick={() => (settings.track ? sort(false) : go(-1))}
              disabled={!settings.track && safeIndex === 0}
              aria-label={settings.track ? t("board.learning") : t("board.prev")}
              className={`${roundBtn} h-12 w-16 sm:w-20 ${settings.track ? "border border-amber/50 text-amber hover:bg-amber/10" : "bg-white/10 hover:bg-white/15"}`}
            >
              <Icon d={settings.track ? ICONS.close : ICONS.prev} />
            </button>
            <span className="min-w-14 text-center font-bold tabular-nums">
              {safeIndex + 1} / {total}
            </span>
            <button
              type="button"
              onClick={() => (settings.track ? sort(true) : go(1))}
              disabled={!settings.track && safeIndex >= total - 1}
              aria-label={settings.track ? t("board.know") : t("board.next")}
              className={`${roundBtn} h-12 w-16 sm:w-20 ${settings.track ? "border border-leaf/60 text-[#8fe36b] hover:bg-leaf/15" : "bg-white/10 hover:bg-white/15"}`}
            >
              <Icon d={settings.track ? ICONS.check : ICONS.next} />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleShuffle}
            disabled={!showNav}
            aria-label={t("study.shuffle")}
            aria-pressed={shuffled}
            className={`${roundBtn} ${shuffled ? "bg-leaf text-night" : "bg-white/10 hover:bg-white/15"}`}
          >
            <Icon d={ICONS.shuffle} size={20} />
          </button>
          <button
            type="button"
            onClick={() => setModal("options")}
            aria-label={t("board.options")}
            className={`${roundBtn} bg-white/10 hover:bg-white/15`}
          >
            <Icon d={ICONS.gear} size={20} />
          </button>
          <button
            type="button"
            onClick={fullscreen}
            aria-label={t("board.fullscreen")}
            className={`${roundBtn} hidden bg-white/10 hover:bg-white/15 sm:flex`}
          >
            <Icon d={ICONS.expand} size={20} />
          </button>
        </div>
      </div>

      {showNav && (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-leaf transition-all"
            style={{ width: `${((safeIndex + 1) / total) * 100}%` }}
          />
        </div>
      )}

      {modal === "options" && (
        <Options
          settings={settings}
          set={set}
          onRestart={fullRestart}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "edit" && card && (
        <EditCard card={card} onSave={onSave} onClose={() => setModal(null)} />
      )}
    </section>
  );
}
