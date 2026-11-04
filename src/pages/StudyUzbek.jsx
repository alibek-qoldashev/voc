import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCards } from "../lib/api";
import { studyBack } from "../lib/decks";
import { MODES, UZBEK_MODES } from "../lib/modes";
import { withMeaning } from "../lib/utils";
import { useStudy } from "../lib/study";
import { useLang } from "../lib/i18n";
import { ErrorBox, Icon, Spinner } from "../components/ui";

// Tarjima rejimi: so'z o'zbekcha tarjimasi (ta'rifdagi chiziqchadan keyingi qism) bilan.
// Shu yerda Anki, Test, Exam yoki Match tanlanadi
export default function StudyUzbek() {
  const { deckId } = useParams();
  const { filter } = useStudy();
  const { t } = useLang();
  const [count, setCount] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getCards(deckId)
      .then((cs) => setCount(withMeaning(filter(cs), "uzbek").length))
      .catch((e) => setError(e.message));
  }, [deckId]);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (count === null) return <Spinner />;

  const back = studyBack(deckId);
  const modes = UZBEK_MODES.map((id) => MODES.find((m) => m.id === id));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold">{t("uzbek.title")}</h1>
      <p className="mt-2 text-mist">
        {count > 0
          ? t("uzbek.hint", { count })
          : t("meaning.needsUz", { count: 1 })}
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {modes.map((m) => {
          const ok = count >= m.min;
          const inner = (
            <>
              <span className={m.color}>
                <Icon d={m.icon} size={24} />
              </span>
              <span>
                <span className="block text-lg font-bold">{t(`mode.${m.id}`)}</span>
                <span className="mt-0.5 block text-sm text-mist">
                  {ok ? t(`uzbek.text.${m.id}`) : t("mode.needs", { count: m.min })}
                </span>
              </span>
            </>
          );
          const cls = "glass flex items-start gap-3 rounded-2xl p-5 text-left";
          return (
            <li key={m.id}>
              {ok ? (
                <Link
                  to={`/flashcards/study/${deckId}/${m.id}?m=uz`}
                  className={`${cls} transition-colors hover:border-white/40`}
                >
                  {inner}
                </Link>
              ) : (
                <div className={`${cls} cursor-not-allowed opacity-40`}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      <Link to={back.to} className="mt-6 inline-block text-sm text-mist hover:text-white">
        ← {t(back.label)}
      </Link>
    </div>
  );
}
