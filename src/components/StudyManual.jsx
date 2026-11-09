import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDecksWithStats } from "../lib/api";
import { studyPath } from "../lib/decks";
import { MODES, UZBEK_MODES } from "../lib/modes";
import { useLang } from "../lib/i18n";
import { BackBtn, Btn, ErrorBox, Icon, Modal, Spinner, fieldCls } from "./ui";
import { EXAM_MAX, ExamSetupForm, loadExamSetup } from "./Exam";

const PLUS = ["M12 5v14", "M5 12h14"];
const CHECK = ["m5 12 5 5 9-10"];
const CLOSE = ["M18 6 6 18", "m6 6 12 12"];

// Oyna bosqichlari: decklar -> usul -> (Test yo'nalishi | Exam sozlamalari | Translation usullari)
const TITLES = {
  pick: "manual.title",
  mode: "manual.modeTitle",
  uzbek: "uzbek.title",
  test: "test.chooseTitle",
  exam: "exam.setupTitle",
};
const DEFAULT_EXAM = 20;

// "Study manual": bir nechta deckni qo'lda tanlab, bitta o'quv sessiyasiga birlashtirish.
// Tanlov saqlanmaydi — har safar yangidan tanlanadi
export default function StudyManual() {
  const location = useLocation();
  const navigate = useNavigate();
  // O'quv sahifasidagi "Boshqa usulni tanlash" shu oynani usullar bosqichida qayta ochadi
  const [reopen] = useState(() => location.state?.reopenManual ?? null);
  const [open, setOpen] = useState(!!reopen);
  const { t } = useLang();
  useEffect(() => {
    if (reopen) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <Btn variant="glass" className="h-[46px]" onClick={() => setOpen(true)}>
        <Icon d={["M4 6h16", "M4 12h10", "M4 18h6", "M17 15l3 3-3 3"]} size={18} />
        {t("manual.button")}
      </Btn>
      {open && <ManualModal initialPicked={reopen} onClose={() => setOpen(false)} />}
    </>
  );
}

function ManualModal({ onClose, initialPicked }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();
  const [decks, setDecks] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  // tanlangan deck id lari, tanlash tartibida
  const [picked, setPicked] = useState(() => initialPicked ?? []);
  const [step, setStep] = useState(initialPicked ? "mode" : "pick"); // pick -> mode
  const searchRef = useRef(null);

  useEffect(() => {
    getDecksWithStats()
      .then(setDecks)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (decks && step === "pick") searchRef.current?.focus();
  }, [decks, step]);

  const byId = useMemo(
    () => Object.fromEntries((decks ?? []).map((d) => [d.id, d])),
    [decks],
  );
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (decks ?? []).filter((d) => d.total > 0);
    return q ? list.filter((d) => d.name.toLowerCase().includes(q)) : list;
  }, [decks, query]);

  const toggle = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const words = picked.reduce((s, id) => s + (byId[id]?.total ?? 0), 0);
  const examMax = Math.min(EXAM_MAX, words);
  // Translation ichidan tanlangan Test/Exam o'zbekcha tarjima bilan
  const [uz, setUz] = useState(false);

  // Usulga o'tish. state: Study manual'ga qaytish uchun ma'lumot va oynada tanlangan sozlamalar
  const go = (mode, inUz, extra = {}) => {
    navigate(`${studyPath(picked, mode)}${inUz ? "?m=uz" : ""}`, {
      state: { manual: { from: location.pathname, picked }, ...extra },
    });
  };
  // Test, Exam va Translation shu oynaning o'zida davom etadi, qolganlari darrov ochiladi
  const choose = (id, inUz) => {
    if (id === "uzbek") return setStep("uzbek");
    if (id === "test" || id === "exam") {
      setUz(inUz);
      return setStep(id);
    }
    go(id, inUz);
  };

  const pills = picked.length > 0 && (
    <ul className="mb-4 flex flex-wrap gap-2" aria-label={t("manual.selected")}>
      {picked.map((id) => (
        <li key={id}>
          <span className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-full bg-white/10 py-1 pl-3 pr-1.5 text-xs font-semibold text-mist">
            <span className="truncate">{byId[id]?.name}</span>
            {step === "pick" && (
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-label={t("manual.remove", { name: byId[id]?.name })}
                className="rounded-full p-0.5 hover:bg-white/15 hover:text-white"
              >
                <Icon d={CLOSE} size={12} />
              </button>
            )}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <Modal
      title={t(TITLES[step])}
      onClose={onClose}
    >
      <ErrorBox>{error}</ErrorBox>
      {!decks && !error && <Spinner />}

      {decks && step === "pick" && (
        <>
          {pills}
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("manual.search")}
            aria-label={t("manual.search")}
            className={fieldCls}
          />
          <ul className="mt-3 max-h-[45vh] space-y-1 overflow-y-auto pr-1">
            {shown.length === 0 && (
              <li className="py-6 text-center text-sm text-mist">
                {t("manual.nothing")}
              </li>
            )}
            {shown.map((d) => {
              const on = picked.includes(d.id);
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => toggle(d.id)}
                    aria-pressed={on}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                      on ? "bg-leaf/10" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{d.name}</span>
                      <span className="text-xs text-mist">
                        {t("count.terms", { count: d.total })}
                      </span>
                    </span>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        on ? "bg-leaf text-night" : "bg-white/10"
                      }`}
                    >
                      <Icon d={on ? CHECK : PLUS} size={16} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
            <span className="text-sm text-mist">
              {picked.length > 0 &&
                t("manual.summary", { decks: picked.length, words })}
            </span>
            <Btn disabled={!picked.length} onClick={() => setStep("mode")}>
              {t("manual.start")}
            </Btn>
          </div>
        </>
      )}

      {decks && step === "mode" && (
        <>
          {pills}
          <ModeGrid count={words} modes={MODES} onPick={(id) => choose(id, false)} />
          <BackBtn onClick={() => setStep("pick")} className="mt-5">
            {t("manual.back")}
          </BackBtn>
        </>
      )}

      {decks && step === "uzbek" && (
        <>
          {pills}
          <ModeGrid
            count={words}
            modes={UZBEK_MODES.map((id) => MODES.find((m) => m.id === id))}
            textKey={(id) => `uzbek.text.${id}`}
            onPick={(id) => choose(id, true)}
          />
          <BackBtn onClick={() => setStep("mode")} className="mt-5">
            {t("study.backModes")}
          </BackBtn>
        </>
      )}

      {decks && step === "test" && (
        <>
          {pills}
          <p className="text-mist">{t("test.chooseHint")}</p>
          <div className="mt-4 grid gap-3">
            {["definition", "term"].map((ask) => {
              const key = ask === "definition" ? "Def" : "Term";
              const sfx = uz ? "Uz" : "";
              return (
                <button
                  key={ask}
                  type="button"
                  onClick={() => go("test", uz, { testAsk: ask })}
                  className="rounded-2xl border border-white/15 bg-white/5 p-5 text-left transition-colors hover:border-leaf hover:bg-leaf/10"
                >
                  <span className="block text-lg font-bold">{t(`test.dir${key}${sfx}`)}</span>
                  <span className="mt-1 block text-sm text-mist">
                    {t(`test.dir${key}Hint${sfx}`)}
                  </span>
                </button>
              );
            })}
          </div>
          <BackBtn onClick={() => setStep(uz ? "uzbek" : "mode")} className="mt-5">
            {t("study.backModes")}
          </BackBtn>
        </>
      )}

      {decks && step === "exam" && (
        <ExamSetupForm
          max={examMax}
          meaning={uz ? "uzbek" : "definition"}
          initial={loadExamSetup(Math.min(DEFAULT_EXAM, examMax), examMax)}
          onStart={(config) => go("exam", uz, { examConfig: config })}
          onBack={() => setStep(uz ? "uzbek" : "mode")}
        />
      )}
    </Modal>
  );
}

// Usullar katakchalari (hammasi bir xil o'lchamda)
function ModeGrid({ count, modes, onPick, textKey = (id) => `mode.${id}.text` }) {
  const { t } = useLang();
  return (
    <ul className="grid auto-rows-fr gap-3 sm:grid-cols-2">
      {modes.map((m) => (
        <li key={m.id} className="flex">
          <button
            type="button"
            disabled={count < m.min}
            title={count < m.min ? t("mode.needs", { count: m.min }) : undefined}
            onClick={() => onPick(m.id)}
            className="glass flex h-full w-full items-start gap-3 rounded-2xl p-4 text-left transition-colors hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className={m.color}>
              <Icon d={m.icon} size={22} />
            </span>
            <span>
              <span className="block font-bold">{t(`mode.${m.id}`)}</span>
              <span className="mt-0.5 block text-xs text-mist">{t(textKey(m.id))}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
