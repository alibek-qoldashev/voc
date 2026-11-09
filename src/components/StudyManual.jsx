import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDecksWithStats } from "../lib/api";
import { studyPath } from "../lib/decks";
import { MODES } from "../lib/modes";
import { useLang } from "../lib/i18n";
import { Btn, ErrorBox, Icon, Modal, Spinner, fieldCls } from "./ui";

const PLUS = ["M12 5v14", "M5 12h14"];
const CHECK = ["m5 12 5 5 9-10"];
const CLOSE = ["M18 6 6 18", "m6 6 12 12"];

// "Study manual": bir nechta deckni qo'lda tanlab, bitta o'quv sessiyasiga birlashtirish.
// Tanlov saqlanmaydi — har safar yangidan tanlanadi
export default function StudyManual() {
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  return (
    <>
      <Btn variant="glass" className="h-[46px]" onClick={() => setOpen(true)}>
        <Icon d={["M4 6h16", "M4 12h10", "M4 18h6", "M17 15l3 3-3 3"]} size={18} />
        {t("manual.button")}
      </Btn>
      {open && <ManualModal onClose={() => setOpen(false)} />}
    </>
  );
}

function ManualModal({ onClose }) {
  const navigate = useNavigate();
  const { t } = useLang();
  const [decks, setDecks] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState([]); // tanlangan deck id lari, tanlash tartibida
  const [step, setStep] = useState("pick"); // pick -> mode
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
      title={step === "pick" ? t("manual.title") : t("manual.modeTitle")}
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
          <ul className="grid auto-rows-fr gap-3 sm:grid-cols-2">
            {MODES.map((m) => {
              const ok = words >= m.min;
              return (
                <li key={m.id} className="flex">
                  <button
                    type="button"
                    disabled={!ok}
                    title={ok ? undefined : t("mode.needs", { count: m.min })}
                    onClick={() => navigate(studyPath(picked, m.id))}
                    className="glass flex h-full w-full items-start gap-3 rounded-2xl p-4 text-left transition-colors hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className={m.color}>
                      <Icon d={m.icon} size={22} />
                    </span>
                    <span>
                      <span className="block font-bold">{t(`mode.${m.id}`)}</span>
                      <span className="mt-0.5 block text-xs text-mist">
                        {t(`mode.${m.id}.text`)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => setStep("pick")}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-leaf/50 bg-leaf/10 px-4 py-2.5 text-sm font-bold text-[#8fe36b] transition-colors hover:bg-leaf/20"
          >
            <Icon d={["M19 12H5", "m12 19-7-7 7-7"]} size={18} />
            {t("manual.back")}
          </button>
        </>
      )}
    </Modal>
  );
}
