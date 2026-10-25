import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDecksWithStats, getFolder, setDeckFolder } from "../lib/api";
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

  const inside = decks.filter((d) => d.folder_id === folderId);
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

  return (
    <div>
      <Link to="/folders" className="text-sm text-mist hover:text-leaf">
        ← {t("nav.folders")}
      </Link>

      <div className="mb-8 mt-2">
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
                className="glass flex h-full flex-col gap-4 rounded-3xl p-5"
              >
                <Link to={`/flashcards/deck/${d.id}`} className="block flex-1">
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
                <button
                  type="button"
                  onClick={() => remove(d.id)}
                  disabled={busy === d.id}
                  className="text-left text-xs text-mist underline hover:text-rose"
                >
                  {t("folder.remove")}
                </button>
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
    </div>
  );
}
