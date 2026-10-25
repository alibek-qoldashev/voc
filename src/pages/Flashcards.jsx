import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteDeck,
  getDecksWithStats,
  getNewLeft,
  renameDeck,
  setDeckPinned,
} from "../lib/api";
import CreateMenu from "../components/CreateMenu";
import ItemMenu from "../components/ItemMenu";
import {
  Badge,
  ErrorBox,
  PageTitle,
  Spinner,
  btnClass,
  fieldCls,
} from "../components/ui";
import { useLang } from "../lib/i18n";

function PinIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M14 2 9 7H5l5 5-6 8 8-6 5 5V15l5-5h-4z" />
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

export default function Flashcards() {
  const [decks, setDecks] = useState(null);
  const [newLeft, setNewLeft] = useState(0);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const { t } = useLang();

  const load = () =>
    Promise.all([getDecksWithStats(), getNewLeft()])
      .then(([d, n]) => {
        setDecks(d);
        setNewLeft(n);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  if (error && !decks) return <ErrorBox>{error}</ErrorBox>;
  if (!decks) return <Spinner />;

  const due = decks.reduce((s, d) => s + (d.dueCount ?? 0), 0);
  const learn = decks.reduce((s, d) => s + (d.learnCount ?? 0), 0);
  const fresh = decks.reduce((s, d) => s + (d.newCount ?? 0), 0);
  const today = due + learn + Math.min(newLeft, fresh);

  const q = query.trim().toLowerCase();
  const shown = decks.filter(
    (d) =>
      !q ||
      d.name.toLowerCase().includes(q) ||
      (d.description || "").toLowerCase().includes(q),
  );

  const pin = async (deck) => {
    try {
      await setDeckPinned(deck.id, !deck.pinned);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const rename = async (deck) => {
    const name = window.prompt(t("decks.renamePrompt"), deck.name);
    if (!name?.trim()) return;
    try {
      await renameDeck(deck.id, name);
      setDecks((ds) =>
        ds.map((d) => (d.id === deck.id ? { ...d, name: name.trim() } : d)),
      );
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (deck) => {
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

  return (
    <div>
      <PageTitle right={<CreateMenu />}>{t("nav.flashcards")}</PageTitle>

      <ErrorBox>{error}</ErrorBox>

      {decks.length > 0 && (
        <section className="glass mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl p-7">
          <div>
            <h2 className="text-2xl font-extrabold">{t("decks.all")}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="sky">
                {t("decks.newBadge", { n: Math.min(newLeft, fresh) })}
              </Badge>
              <Badge tone="rose">{t("decks.learningBadge", { n: learn })}</Badge>
              <Badge tone="leaf">{t("decks.dueBadge", { n: due })}</Badge>
            </div>
          </div>
          {today > 0 ? (
            <Link
              to="/flashcards/study/all"
              className={btnClass("primary", "px-8 py-3.5")}
            >
              {t("decks.studyN", { count: today })}
            </Link>
          ) : (
            <p className="text-mist">{t("decks.nothing")}</p>
          )}
        </section>
      )}

      {decks.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center">
          <p className="text-xl font-bold">{t("decks.empty")}</p>
          <p className="mt-1 text-mist">
            {t("decks.emptyHint")}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">{t("decks.yours")}</h2>
            <input
              className={`${fieldCls} max-w-xs`}
              placeholder={t("decks.search")}
              aria-label={t("decks.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {shown.length === 0 ? (
            <p className="text-mist">{t("common.noMatch", { query })}</p>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((d) => {
                const ready =
                  (d.newCount ?? 0) + (d.learnCount ?? 0) + (d.dueCount ?? 0);
                return (
                  <li
                    key={d.id}
                    className="glass relative flex h-full flex-col gap-4 rounded-3xl p-5"
                  >
                    <div className="absolute right-3 top-3">
                      <ItemMenu
                        label={t("common.optionsFor", { name: d.name })}
                        items={[
                          {
                            label: d.pinned ? t("common.unpin") : t("common.pin"),
                            onClick: () => pin(d),
                          },
                          { label: t("common.rename"), onClick: () => rename(d) },
                          {
                            label: t("common.delete"),
                            onClick: () => remove(d),
                            danger: true,
                          },
                        ]}
                      />
                    </div>

                    <Link
                      to={`/flashcards/deck/${d.id}`}
                      className="block flex-1 pr-10"
                    >
                      <h3 className="text-xl font-bold leading-snug">
                        {d.name}
                      </h3>
                      {d.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-mist">
                          {d.description}
                        </p>
                      )}
                      <Counts deck={d} />
                      <p className="mt-3 flex items-center gap-2 text-xs text-mist">
                        {t("count.termsTotal", { count: d.total })}
                        {d.pinned && (
                          <span className="flex items-center gap-1 font-semibold text-leaf">
                            <PinIcon /> {t("common.pinned")}
                          </span>
                        )}
                      </p>
                    </Link>

                    {ready > 0 ? (
                      <Link
                        to={`/flashcards/deck/${d.id}`}
                        className={btnClass("primary", "w-full")}
                      >
                        {t("decks.study")}
                      </Link>
                    ) : (
                      <span className="text-center text-sm text-mist">
                        {d.total ? t("decks.caughtUp") : t("decks.addFirst")}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
