import { MEANINGS } from "../lib/utils";
import { useLang } from "../lib/i18n";

// Test, Exam va Match boshida: so'z ta'rif bilan yoki o'zbekcha tarjimasi bilan so'raladi
export default function MeaningPicker({ value, onPick, card = true }) {
  const { t } = useLang();
  const body = (
    <>
      <h1 className="text-2xl font-extrabold">{t("meaning.title")}</h1>
      <p className="mt-2 text-mist">{t("meaning.hint")}</p>
      <div className="mt-6 grid gap-3">
        {MEANINGS.map((m) => (
          <button
            key={m}
            type="button"
            autoFocus={m === value}
            onClick={() => onPick(m)}
            className={`rounded-2xl border bg-white/5 p-5 text-left transition-colors hover:border-leaf hover:bg-leaf/10 ${
              m === value ? "border-leaf/60" : "border-white/15"
            }`}
          >
            <span className="block text-lg font-bold">{t(`meaning.pair.${m}`)}</span>
            <span className="mt-1 block text-sm text-mist">
              {t(`meaning.pairHint.${m}`)}
            </span>
          </button>
        ))}
      </div>
    </>
  );
  if (!card) return body;
  return (
    <div className="mx-auto max-w-xl">
      <div className="glass rounded-3xl p-8">{body}</div>
    </div>
  );
}
