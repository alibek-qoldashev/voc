import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHomeData } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import CreateMenu from "../components/CreateMenu";
import {
  Badge,
  ErrorBox,
  PageTitle,
  Spinner,
  btnClass,
} from "../components/ui";
import { useLang, weekdayShort } from "../lib/i18n";

function FolderIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7a1 1 0 0 1 1-1h4l2 2h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function DeckCard({ deck }) {
  const { t } = useLang();
  const counts = [
    { label: t("count.new"), value: deck.newCount ?? 0, cls: "text-sky" },
    { label: t("count.learn"), value: deck.learnCount ?? 0, cls: "text-rose" },
    { label: t("count.due"), value: deck.dueCount ?? 0, cls: "text-[#8fe36b]" },
  ];
  return (
    <Link
      to={`/flashcards/deck/${deck.id}`}
      className="glass flex h-full flex-col rounded-3xl p-5 transition-colors hover:border-white/30"
    >
      <h3 className="text-lg font-bold leading-snug">{deck.name}</h3>
      <dl className="mt-3 flex gap-5">
        {counts.map((c) => (
          <div key={c.label}>
            <dt className="text-xs text-mist">{c.label}</dt>
            <dd
              className={`text-lg font-extrabold tabular-nums ${c.value ? c.cls : "text-mist/40"}`}
            >
              {c.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-auto pt-3 text-xs text-mist">
        {t("count.terms", { count: deck.total })}
      </p>
    </Link>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getHomeData()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!data) return <Spinner />;

  const max = Math.max(1, ...data.days.map((d) => d.count));

  return (
    <div className="space-y-10">
      <PageTitle right={<CreateMenu />}>{t("home.welcome")}</PageTitle>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass rounded-3xl p-7">
          <p className="text-mist">{t("home.today")}</p>
          <p className="mt-1 text-6xl font-extrabold">
            {data.todayCount}
            <span className="ml-3 text-xl font-semibold text-mist">
              {t("home.toReview", { count: data.todayCount })}
            </span>
          </p>
          <div className="mt-6">
            {data.todayCount > 0 ? (
              <Link
                to="/flashcards/study/all"
                className={btnClass("primary", "px-8 py-3.5")}
              >
                {t("home.start")}
              </Link>
            ) : data.hasDecks ? (
              <p className="text-mist">{t("home.caughtUp")}</p>
            ) : (
              <Link
                to="/create-deck"
                className={btnClass("primary", "px-8 py-3.5")}
              >
                {t("home.firstDeck")}
              </Link>
            )}
          </div>
        </div>

        <div className="glass rounded-3xl p-7">
          <div className="flex items-baseline justify-between">
            <p className="text-mist">{t("home.last7")}</p>
            <p className="text-sm">
              <span className="text-xl font-extrabold text-leaf">
                {data.streak}
              </span>{" "}
              {t("home.streak", { count: data.streak })}
            </p>
          </div>
          <div
            className="mt-5 flex h-24 items-end gap-2"
            role="img"
            aria-label={t("home.chartLabel")}
          >
            {data.days.map((d, i) => (
              <div
                key={i}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <div
                  className={`w-full rounded-md ${d.count ? "bg-leaf" : "bg-white/10"}`}
                  style={{ height: `${Math.max(6, (d.count / max) * 64)}px` }}
                  title={t("home.reviews", { count: d.count })}
                />
                <span className="text-[11px] text-mist">
                  {weekdayShort(lang, d.date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">{t("home.recentDecks")}</h2>
          <Link to="/flashcards" className="text-sm text-leaf underline">
            {t("home.allDecks")}
          </Link>
        </div>
        {data.recentDecks.length === 0 ? (
          <p className="text-mist">{t("home.noDecks")}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {data.recentDecks.map((d) => (
              <DeckCard key={d.id} deck={d} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">{t("home.recentFolders")}</h2>
          <Link to="/folders" className="text-sm text-leaf underline">
            {t("home.allFolders")}
          </Link>
        </div>
        {data.recentFolders.length === 0 ? (
          <p className="text-mist">{t("home.noFolders")}</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {data.recentFolders.map((f) => (
              <li key={f.id}>
                <Link
                  to={`/folders/${f.id}`}
                  className="glass flex h-full flex-col gap-3 rounded-3xl p-5 transition-colors hover:border-white/30"
                >
                  <span className="text-leaf">
                    <FolderIcon />
                  </span>
                  <span className="text-lg font-bold leading-snug">
                    {f.name}
                  </span>
                  <span className="mt-auto pt-2">
                    <Badge>
                      {t("count.decks", { count: f.deckCount })}
                    </Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-mist">
        {t("home.signedIn", { email: user?.email })}
      </p>
    </div>
  );
}
