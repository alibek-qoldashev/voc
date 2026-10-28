import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteDeck,
  getDecksWithStats,
  getFolder,
  setDeckFolder,
} from "../lib/api";
import ItemMenu from "../components/ItemMenu";
import SortMenu, { SORTS, sortDecks } from "../components/SortMenu";
import { load as loadPref, save as savePref } from "../lib/storage";
import FolderPicker from "../components/FolderPicker";
import { EXAM_MIN_WORDS } from "./FolderExam";
import { Badge, Btn, ErrorBox, Spinner, btnClass } from "../components/ui";
import { useLang } from "../lib/i18n";

function PlusIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

// Anki uslubidagi uchta hisob
function Counts({ deck }) {
  const { t } = useLang();
  const items = [
    { label: t("count.new"), value: deck.newCount ?? 0, cls: "text-sky" },
    { label: t("count.learn"), value: deck.learnCount ?? 0, cls: "text-rose" },
    { label: t("count.due"), value: deck.dueCount ?? 0, cls: "text-[#8fe36b]" },
  ];
  return (
    <dl className="mt-3 flex gap-5">
      {items.map((i) => (
        <div key={i.label}>
          <dt className="text-xs text-mist">{i.label}</dt>
          <dd
            className={`text-xl font-extrabold tabular-nums ${i.value ? i.cls : "text-mist/40"}`}
          >
            {i.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function FolderDetail() {
  const { folderId } = useParams();
  const [folder, setFolder] = useState(null);
  const [decks, setDecks] = useState(null);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState("");
  const [moving, setMoving] = useState(null); // "Add to folder" oynasidagi deck
  // Flashcards sahifasi bilan bir xil saralash tanlovi
  const [sortBy, setSortBy] = useState(() => {
    const saved = loadPref("deck-sort", "name");
    return SORTS.includes(saved) ? saved : "name";
  });
  const changeSort = (s) => {
    setSortBy(s);
    savePref("deck-sort", s);
  };
  const navigate = useNavigate();
  const { t } = useLang();

  useEffect(() => {
    Promise.all([getFolder(folderId), getDecksWithStats()])
      .then(([f, all]) => {
        setFolder(f);
        setDecks(all);
      })
      .catch((e) => setError(e.message));
  }, [folderId]);

  if (error && !folder) return <ErrorBox>{error}</ErrorBox>;
  if (!folder || !decks) return <Spinner />;

  const inside = sortDecks(
    decks.filter((d) => d.folder_id === folderId),
    sortBy,
  );
  const totalWords = inside.reduce((s, d) => s + (d.total ?? 0), 0);
  const outside = decks.filter((d) => d.folder_id !== folderId);

  const add = async (deckId) => {
    setBusy(deckId);
    try {
      await setDeckFolder(deckId, folderId);
      setDecks((ds) =>
        ds.map((d) => (d.id === deckId ? { ...d, folder_id: folderId } : d)),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const remove = async (deckId) => {
    setBusy(deckId);
    try {
      await setDeckFolder(deckId, null);
      setDecks((ds) =>
        ds.map((d) => (d.id === deckId ? { ...d, folder_id: null } : d)),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const removeDeck = async (deck) => {
    if (
      !window.confirm(
        t("decks.deleteConfirm", { name: deck.name, count: deck.total }),
      )
    )
      return;
    try {
      await deleteDeck(deck.id);
      setDecks((ds) => ds.filter((d) => d.id !== deck.id));
    } catch (e) {
      setError(e.message);
    }
  };

  const moved = (deckId, folder) =>
    setDecks((ds) =>
      ds.map((d) => (d.id === deckId ? { ...d, folder_id: folder } : d)),
    );

  return (
    <div>
      <Link to="/folders" className="text-sm text-mist hover:text-leaf">
        ← {t("nav.folders")}
      </Link>

      <div className="mb-8 mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{folder.name}</h1>
          {folder.description && (
            <p className="mt-1 text-mist">{folder.description}</p>
          )}
          <div className="mt-2">
            <Badge>
              {t("count.decks", { count: inside.length })}
            </Badge>
          </div>
        </div>
        {inside.length > 0 && (
          <div className="flex items-center gap-2">
            {totalWords >= EXAM_MIN_WORDS ? (
              <Link
                to={`/folders/${folderId}/exam`}
                className={btnClass("primary", "h-[46px]")}
              >
                {t("exam.studyAll")}
              </Link>
            ) : (
              <span
                title={t("exam.needs", { count: EXAM_MIN_WORDS })}
                className={btnClass("primary", "h-[46px] cursor-not-allowed opacity-40")}
              >
                {t("exam.studyAll")}
              </span>
            )}
            {inside.length > 1 && <SortMenu value={sortBy} onChange={changeSort} />}
          </div>
        )}
      </div>

      <ErrorBox>{error}</ErrorBox>

      {inside.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center">
          <p className="text-xl font-bold">{t("folder.empty")}</p>
          <p className="mt-1 text-mist">
            {t("folder.emptyHint")}
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setPicking((p) => !p)}
              aria-expanded={picking}
              aria-label={t("folder.addDeck")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf text-night hover:bg-[#63c941]"
            >
              <PlusIcon />
            </button>
          </div>
        </div>
      ) : (
        <>
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {inside.map((d) => (
              <li
                key={d.id}
                className="glass relative flex h-full flex-col gap-4 rounded-3xl p-5"
              >
                <div className="absolute right-3 top-3">
                  <ItemMenu
                    label={t("common.optionsFor", { name: d.name })}
                    items={[
                      {
                        label: t("common.edit"),
                        onClick: () => navigate(`/flashcards/deck/${d.id}?edit=1`),
                      },
                      { label: t("folder.addTo"), onClick: () => setMoving(d) },
                      { label: t("folder.remove"), onClick: () => remove(d.id) },
                      {
                        label: t("common.delete"),
                        onClick: () => removeDeck(d),
                        danger: true,
                      },
                    ]}
                  />
                </div>
                <Link to={`/flashcards/deck/${d.id}`} className="block flex-1 pr-10">
                  <h3 className="text-xl font-bold leading-snug">{d.name}</h3>
                  {d.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-mist">
                      {d.description}
                    </p>
                  )}
                  <Counts deck={d} />
                  <p className="mt-3 text-xs text-mist">
                    {t("count.termsTotal", { count: d.total })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPicking((p) => !p)}
              aria-expanded={picking}
              aria-label={t("folder.addDeck")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf text-night hover:bg-[#63c941]"
            >
              <PlusIcon />
            </button>
            <span className="text-sm text-mist">{t("folder.addAnother")}</span>
          </div>
        </>
      )}

      {picking && (
        <section className="glass mt-6 rounded-3xl p-6">
          <h2 className="text-lg font-bold">{t("folder.addTitle")}</h2>

          {outside.length === 0 ? (
            <div className="mt-4">
              <p className="text-mist">{t("decks.empty")}</p>
              <Link
                to={`/create-deck?folder=${folderId}`}
                className={btnClass("primary", "mt-4")}
              >
                {t("createDeck.title")}
              </Link>
            </div>
          ) : (
            <>
              <ul className="mt-4 space-y-3">
                {outside.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold">{d.name}</p>
                      <p className="text-sm text-mist">
                        {t("count.terms", { count: d.total })}
                        {d.folder_id ? ` · ${t("folder.inOther")}` : ""}
                      </p>
                    </div>
                    <Btn
                      className="!px-5 !py-2"
                      onClick={() => add(d.id)}
                      disabled={busy === d.id}
                    >
                      {busy === d.id ? t("folder.adding") : t("folder.add")}
                    </Btn>
                  </li>
                ))}
              </ul>
              <Link
                to={`/create-deck?folder=${folderId}`}
                className={btnClass("glass", "mt-5")}
              >
                {t("folder.createInstead")}
              </Link>
            </>
          )}
        </section>
      )}

      {moving && (
        <FolderPicker
          deck={moving}
          onChange={(folder) => moved(moving.id, folder)}
          onClose={() => setMoving(null)}
        />
      )}
    </div>
  );
}
