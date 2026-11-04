import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { getFolder, getFolderCards } from "../lib/api";
import { definitionOnly } from "../lib/utils";
import { useLang } from "../lib/i18n";
import { ErrorBox, Spinner } from "../components/ui";
import {
  EXAM_MAX,
  EXAM_MIN_WORDS,
  ExamRunner,
  ExamSetup,
  loadExamSetup,
} from "../components/Exam";

export { EXAM_MIN_WORDS };

// Papkadagi so'zlarning shuncha qismi standart savollar soni
const SHARE = 0.3;

const uniqueTerms = (cards) =>
  new Set(cards.map((c) => c.term.trim().toLowerCase())).size;

// Papkadagi "Study all" sozlamalari: oynada boshlanadi, papka sahifasida ham, shu yerda ham
export const folderExamDefaults = (words) =>
  loadExamSetup(
    Math.max(EXAM_MIN_WORDS, Math.round(words * SHARE)),
    Math.min(EXAM_MAX, words),
  );

export default function FolderExam() {
  const { folderId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { t } = useLang();
  const [folder, setFolder] = useState(null);
  const [cards, setCards] = useState(null);
  const [error, setError] = useState("");
  // Papka sahifasidagi oynadan kelgan sozlamalar; to'g'ridan-to'g'ri ochilsa oyna shu yerda chiqadi
  const [config, setConfig] = useState(state?.config ?? null);
  const [setupOpen, setSetupOpen] = useState(!state?.config);
  const [run, setRun] = useState(0);

  useEffect(() => {
    Promise.all([getFolder(folderId), getFolderCards(folderId)])
      .then(([f, cs]) => {
        setFolder(f);
        setCards(cs.filter(definitionOnly));
      })
      .catch((e) => setError(e.message));
  }, [folderId]);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!cards || !folder) return <Spinner label={t("exam.preparing")} />;

  const back = `/folders/${folderId}`;
  const words = uniqueTerms(cards);
  const header = (
    <div className="mb-5 flex items-center justify-between gap-3">
      <Link to={back} className="text-sm text-mist hover:text-leaf">
        ← {folder.name}
      </Link>
      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-mist">
        {t("exam.title")}
      </span>
    </div>
  );

  if (words < EXAM_MIN_WORDS) {
    return (
      <div className="mx-auto max-w-xl">
        {header}
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-xl font-bold">{t("study.notEnough")}</p>
          <p className="mt-1 text-mist">
            {t("exam.needs", { count: EXAM_MIN_WORDS })}
          </p>
        </div>
      </div>
    );
  }

  const setup = setupOpen && (
    <ExamSetup
      max={Math.min(EXAM_MAX, words)}
      initial={config ?? folderExamDefaults(words)}
      onStart={(c) => {
        setConfig(c);
        setSetupOpen(false);
        setRun((r) => r + 1);
      }}
      // Hali boshlanmagan bo'lsa yopish papkaga qaytaradi
      onClose={() => (config ? setSetupOpen(false) : navigate(back))}
    />
  );

  return (
    <>
      {config ? (
        <ExamRunner
          key={run}
          cards={cards}
          config={config}
          back={back}
          backLabel={t("exam.backToFolder")}
          onSettings={() => setSetupOpen(true)}
          header={header}
        />
      ) : (
        header
      )}
      {setup}
    </>
  );
}
