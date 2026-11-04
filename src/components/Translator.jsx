import { useEffect, useRef, useState } from "react";
import { translateWord } from "../lib/api";
import { speak } from "../lib/utils";
import { useLang } from "../lib/i18n";
import { Btn, ErrorBox, Icon, Modal, SpeakIcon, Spinner, fieldCls } from "./ui";

export const TRANSLATE_ICON = [
  "M5 8h8",
  "M9 5v3",
  "M7 8c0 4 3 7 6 8",
  "M11 8c0 3-3 6-6 7",
  "m13 20 4-9 4 9",
  "M14.5 17h5",
];
const SWAP = ["M7 7h13", "m16 3 4 4-4 4", "M17 17H4", "m8 21-4-4 4-4"];

const LEVEL_TONE = {
  A1: "bg-leaf/15 text-[#8fe36b]",
  A2: "bg-leaf/15 text-[#8fe36b]",
  B1: "bg-sky/15 text-sky",
  B2: "bg-sky/15 text-sky",
  C1: "bg-rose/15 text-rose",
  C2: "bg-rose/15 text-rose",
};

// Navbardagi tezkor tarjimon: inglizcha so'z -> ta'rif, o'zbekcha, sinonimlar, daraja;
// o'zbekcha so'z -> inglizcha so'z, sinonimlar, daraja. Qaysi sahifada bo'lsa ham oyna ochiladi
export default function Translator({ onClose }) {
  const { t } = useLang();
  const [from, setFrom] = useState("en");
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const asked = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, [from]);

  const submit = async (e) => {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    const id = ++asked.current;
    setBusy(true);
    setError("");
    try {
      const r = await translateWord(q, from);
      if (id === asked.current) setResult({ ...r, from, query: q });
    } catch (err) {
      if (id === asked.current) setError(err.message);
    } finally {
      if (id === asked.current) setBusy(false);
    }
  };

  const swap = () => {
    setFrom((f) => (f === "en" ? "uz" : "en"));
    setResult(null);
    setError("");
  };

  const lang = (code) => (
    <span className="flex-1 rounded-full bg-white/5 py-2.5 text-center text-sm font-bold">
      {t(`translator.${code}`)}
    </span>
  );

  return (
    <Modal title={t("translator.title")} onClose={onClose} blur>
      <div className="flex items-center gap-2">
        {lang(from)}
        <button
          type="button"
          onClick={swap}
          aria-label={t("translator.swap")}
          title={t("translator.swap")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 hover:bg-white/10"
        >
          <Icon d={SWAP} size={18} />
        </button>
        {lang(from === "en" ? "uz" : "en")}
      </div>

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={80}
          placeholder={t(from === "en" ? "translator.placeholderEn" : "translator.placeholderUz")}
          aria-label={t("translator.input")}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className={`${fieldCls} min-w-0 flex-1 text-base`}
        />
        <Btn type="submit" disabled={busy || !text.trim()}>
          {t("translator.go")}
        </Btn>
      </form>

      <div className="mt-5" aria-live="polite">
        <ErrorBox>{error}</ErrorBox>
        {busy && <Spinner label={t("translator.working")} />}
        {!busy && result && <Result r={result} />}
      </div>
    </Modal>
  );
}

function Result({ r }) {
  const { t } = useLang();
  if (!r.found) {
    return (
      <p className="rounded-2xl bg-white/5 p-5 text-mist">
        {t("translator.notFound", { word: r.query })}
      </p>
    );
  }
  const english = r.english || r.query;
  const first = english.split(",")[0].trim();
  return (
    <section className="space-y-4 rounded-2xl bg-white/5 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-2xl font-extrabold">{r.from === "en" ? english : r.uzbek || r.query}</p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${LEVEL_TONE[r.level] ?? "bg-white/10"}`}
          title={t("translator.level")}
        >
          {r.level}
        </span>
        <button
          type="button"
          onClick={() => speak(first)}
          aria-label={t("common.listenTo", { term: first })}
          className="rounded-full p-1.5 text-mist hover:bg-white/10 hover:text-white"
        >
          <SpeakIcon />
        </button>
      </div>

      {r.from === "en" ? (
        <>
          {r.definition && <Row label={t("translator.definition")}>{r.definition}</Row>}
          {r.uzbek && (
            <Row label={t("translator.uzbek")}>
              <span className="font-bold text-[#8fe36b]">{r.uzbek}</span>
            </Row>
          )}
        </>
      ) : (
        <Row label={t("translator.english")}>
          <span className="font-bold text-[#8fe36b]">{english}</span>
        </Row>
      )}

      {r.synonyms?.length > 0 && (
        <Row label={t("translator.synonyms")}>
          <span className="flex flex-wrap gap-2">
            {r.synonyms.map((s) => (
              <span key={s} className="rounded-full bg-white/10 px-3 py-1 text-sm">
                {s}
              </span>
            ))}
          </span>
        </Row>
      )}
      <Row label={t("translator.level")}>{t(`translator.cefr.${r.level}`)}</Row>
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-mist">{label}</p>
      <div className="mt-1 leading-snug">{children}</div>
    </div>
  );
}
