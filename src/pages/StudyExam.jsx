import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getCards } from "../lib/api";
import { definitionOnly, withMeaning } from "../lib/utils";
import { useStudy } from "../lib/study";
import { useLang } from "../lib/i18n";
import { studyBack, useModeBack } from "../lib/decks";
import { ErrorBox, Spinner } from "../components/ui";
import {
  EXAM_MAX,
  ExamRunner,
  ExamSetup,
  loadExamSetup,
} from "../components/Exam";

// Standart savollar soni (deckda bundan kam so'z bo'lsa — hammasi)
const DEFAULT_COUNT = 20;

// Deckdagi Exam rejimi: kirganda sozlamalar oynasi chiqadi
export default function StudyExam() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { filter, meaning } = useStudy();
  const { t } = useLang();
  const [cards, setCards] = useState(null);
  const [error, setError] = useState("");
  const [config, setConfig] = useState(null);
  const [setupOpen, setSetupOpen] = useState(true);
  const [run, setRun] = useState(0);
  const modeBack = useModeBack(deckId);

  useEffect(() => {
    getCards(deckId)
      // Tarjima rejimida ta'rif o'rniga o'zbekcha tarjima (tarjimasi yo'q kartalar tushib qoladi)
      .then((cs) => setCards(withMeaning(filter(cs), meaning).filter(definitionOnly)))
      .catch((e) => setError(e.message));
  }, [deckId]);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!cards) return <Spinner label={t("exam.preparing")} />;

  const { to: back, label: backLabel } = studyBack(deckId);

  if (cards.length < 2) {
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
        <p className="text-xl font-bold">{t("study.notEnough")}</p>
        {meaning === "uzbek" && (
          <p className="mt-1 text-mist">{t("meaning.needsUz", { count: 2 })}</p>
        )}
        <Link to={back} className="mt-5 inline-block text-leaf underline">
          {t(backLabel)}
        </Link>
      </div>
    );
  }

  const max = Math.min(EXAM_MAX, cards.length);

  return (
    <>
      {config && (
        <ExamRunner
          key={run}
          cards={cards}
          config={config}
          back={back}
          backLabel={t(backLabel)}
          onSettings={() => setSetupOpen(true)}
        />
      )}
      {setupOpen && (
        <ExamSetup
          max={max}
          meaning={meaning}
          initial={config ?? loadExamSetup(Math.min(DEFAULT_COUNT, max), max)}
          onStart={(c) => {
            setConfig(c);
            setSetupOpen(false);
            setRun((r) => r + 1);
          }}
          onClose={() => (config ? setSetupOpen(false) : navigate(back))}
          onBack={modeBack}
        />
      )}
    </>
  );
}
