import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getCards } from "../lib/api";
import { definitionOnly, withMeaning } from "../lib/utils";
import { useStudy } from "../lib/study";
import { useLang } from "../lib/i18n";
import { studyBack } from "../lib/decks";
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
  const { filter } = useStudy();
  const { t } = useLang();
  const [cards, setCards] = useState(null);
  const [error, setError] = useState("");
  const [config, setConfig] = useState(null);
  const [setupOpen, setSetupOpen] = useState(true);
  const [run, setRun] = useState(0);

  useEffect(() => {
    getCards(deckId)
      .then((cs) => setCards(filter(cs).filter(definitionOnly)))
      .catch((e) => setError(e.message));
  }, [deckId]);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!cards) return <Spinner label={t("exam.preparing")} />;

  const { to: back, label: backLabel } = studyBack(deckId);

  if (cards.length < 2) {
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
        <p className="text-xl font-bold">{t("study.notEnough")}</p>
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
          maxFor={(m) => Math.min(EXAM_MAX, withMeaning(cards, m).length)}
          initial={config ?? loadExamSetup(Math.min(DEFAULT_COUNT, max), max)}
          onStart={(c) => {
            setConfig(c);
            setSetupOpen(false);
            setRun((r) => r + 1);
          }}
          onClose={() => (config ? setSetupOpen(false) : navigate(back))}
        />
      )}
    </>
  );
}
