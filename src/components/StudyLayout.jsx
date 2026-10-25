import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { MODES } from "../lib/modes";
import {
  QUESTION_TYPES,
  STUDY_SETTINGS_KEY,
  loadStarred,
  loadStudySettings,
} from "../lib/study";
import { save } from "../lib/storage";
import { useLang } from "../lib/i18n";
import { Icon, Modal, SpeakIcon, Toggle } from "./ui";

const GEAR = [
  "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
];

// [tugma, tarjima kaliti]
const SHORTCUTS = {
  learn: [
    ["Enter", "keys.checkContinue"],
    ["keys.click", "board.keyFlip"],
  ],
  standard: [
    ["Space", "keys.showAnswer"],
    ["1 – 4", "keys.ratings"],
  ],
  test: [["Enter", "keys.nextQuestion"]],
  write: [["Enter", "keys.checkContinue"]],
  match: [["keys.click", "keys.matchPick"]],
};

function ModeMenu({ deckId, mode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = MODES.find((m) => m.id === mode);
  const { t } = useLang();

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = (
    <>
      <span className={current.color}>
        <Icon d={current.icon} size={24} />
      </span>
      <span className="text-lg font-bold">{t(`mode.${current.id}`)}</span>
    </>
  );

  // "Hamma decklar" sessiyasida boshqa rejim yo'q
  if (deckId === "all") return <div className="flex items-center gap-3">{label}</div>;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/5"
      >
        {label}
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <Icon d={["m6 9 6 6 6-6"]} size={22} />
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#141831] p-1.5"
        >
          {MODES.map((m) => (
            <Link
              key={m.id}
              role="menuitem"
              to={`/flashcards/study/${deckId}/${m.id}`}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold hover:bg-white/10 ${m.id === mode ? "bg-white/10" : ""}`}
            >
              <span className={m.color}>
                <Icon d={m.icon} size={20} />
              </span>
              {t(`mode.${m.id}`)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const TYPE_ICONS = {
  flip: ["M4 7h12v13H4z", "M8 3h12v13"],
  choice: ["M9 6h11", "M9 12h11", "M9 18h11", "M4 6h.01", "M4 12h.01", "M4 18h.01"],
  match: ["M4 4h7v7H4z", "M13 13h7v7h-7z", "M13 7.5h7", "M4 16.5h7"],
  write: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"],
};

const pill = (on) =>
  `flex h-14 flex-1 items-center justify-center rounded-full border-2 transition-colors ${
    on
      ? "border-leaf bg-leaf/15 text-white"
      : "border-transparent bg-white/10 text-mist hover:bg-white/15"
  }`;

// Gear ostidagi tezkor sozlamalar
function SettingsPopover({ mode, settings, update, onAll, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => !ref.current?.contains(e.target) && onClose();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const onCount = Object.values(settings.types).filter(Boolean).length;
  const { t } = useLang();

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-white/15 bg-[#0b0d26] p-4"
    >
      <div className="flex gap-3">
        <button
          type="button"
          aria-pressed={settings.shuffle}
          aria-label={t("study.shuffle")}
          title={t("study.shuffle")}
          onClick={() => update({ shuffle: !settings.shuffle })}
          className={pill(settings.shuffle)}
        >
          <Icon d={["M16 3h5v5", "M4 20 21 3", "M21 16v5h-5", "m15 15 6 6", "M4 4l5 5"]} />
        </button>
        <button
          type="button"
          aria-pressed={settings.starredOnly}
          aria-label={t("study.starredOnly")}
          title={t("study.starredOnly")}
          onClick={() => update({ starredOnly: !settings.starredOnly })}
          className={pill(settings.starredOnly)}
        >
          <Icon
            d={["m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"]}
            fill={settings.starredOnly ? "currentColor" : "none"}
          />
        </button>
        <button
          type="button"
          aria-pressed={settings.tts}
          aria-label={t("study.tts")}
          title={t("study.tts")}
          onClick={() => update({ tts: !settings.tts })}
          className={pill(settings.tts)}
        >
          <SpeakIcon />
        </button>
      </div>

      {mode === "learn" && (
        <div className="mt-4 rounded-2xl bg-white/5 p-5">
          <p className="text-lg font-bold">{t("study.types")}</p>
          <ul className="mt-4 space-y-4">
            {QUESTION_TYPES.map((q) => {
              const on = settings.types[q.id];
              return (
                <li key={q.id} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3 font-semibold text-white/90">
                    <Icon d={TYPE_ICONS[q.id]} size={20} />
                    {t(`qtype.${q.id}`)}
                  </span>
                  <Toggle
                    label={t(`qtype.${q.id}`)}
                    checked={on}
                    // Kamida bitta tur yoqilgan qolishi kerak
                    onChange={(v) =>
                      (v || onCount > 1) &&
                      update({ types: { ...settings.types, [q.id]: v } })
                    }
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onAll}
        className="mt-4 w-full rounded-xl py-2 text-center font-bold text-sky hover:bg-white/5"
      >
        {t("study.allOptions")}
      </button>
    </div>
  );
}

// Learn, Anki, Test, Write va Match sahifalarining umumiy tepa paneli
export default function StudyLayout() {
  const { deckId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(loadStudySettings);
  const [starred] = useState(() => loadStarred(deckId));
  const [popover, setPopover] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const { t } = useLang();

  const last = pathname.split("/").pop();
  const mode = MODES.some((m) => m.id === last) ? last : "standard";
  const back = deckId === "all" ? "/flashcards" : `/flashcards/deck/${deckId}`;
  const noStarred = settings.starredOnly && starred.size === 0;

  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    save(STUDY_SETTINGS_KEY, next);
    // Ovozdan boshqa sozlamalar savollarni o'zgartiradi, shuning uchun qaytadan boshlaymiz
    if (!("tts" in patch && Object.keys(patch).length === 1)) setRunKey((k) => k + 1);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
        <ModeMenu deckId={deckId} mode={mode} />
        <div className="relative flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPopover((o) => !o)}
            aria-label={t("study.settings")}
            aria-expanded={popover}
            className="rounded-full p-2.5 hover:bg-white/10"
          >
            <Icon d={GEAR} size={24} />
          </button>
          <button
            type="button"
            onClick={() => navigate(back)}
            aria-label={t("common.close")}
            className="rounded-full p-2.5 hover:bg-white/10"
          >
            <Icon d={["M18 6 6 18", "m6 6 12 12"]} size={24} />
          </button>
          {popover && (
            <SettingsPopover
              mode={mode}
              settings={settings}
              update={update}
              onAll={() => {
                setPopover(false);
                setAllOpen(true);
              }}
              onClose={() => setPopover(false)}
            />
          )}
        </div>
      </div>

      {noStarred ? (
        <div className="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
          <p className="text-xl font-bold">{t("study.noStarred")}</p>
          <p className="mt-1 text-mist">
            {t("study.noStarredHint")}
          </p>
          <button
            type="button"
            onClick={() => update({ starredOnly: false })}
            className="mt-5 text-leaf underline"
          >
            {t("study.allTerms")}
          </button>
        </div>
      ) : (
        // runKey o'zgarsa sahifa noldan boshlanadi
        <Outlet key={`${pathname}-${runKey}`} context={{ settings, starred }} />
      )}

      {allOpen && (
        <Modal title={t("study.settings")} onClose={() => setAllOpen(false)}>
          <p className="text-lg font-bold">{t("study.shortcuts")}</p>
          <dl className="mt-4 space-y-2">
            {SHORTCUTS[mode].map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 text-sm">
                <dt className="min-w-16 rounded-lg bg-white/10 px-2 py-1 text-center font-bold">
                  {t(k)}
                </dt>
                <dd className="text-mist">{t(v)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={() => {
                setRunKey((k) => k + 1);
                setAllOpen(false);
              }}
              className="text-lg font-bold text-rose hover:underline"
            >
              {t("study.restart", { mode: t(`mode.${mode}`) })}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
