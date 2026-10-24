import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHomeData } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import DeckTile from "../components/DeckTile";
import {
  Badge,
  ErrorBox,
  PageTitle,
  Spinner,
  btnClass,
} from "../components/ui";
import CreateDeckButton from "../components/CreateDeckButton";
import CreateMenu from "../components/CreateMenu"; // CreateDeckButton o'rniga

const RATING = [
  { label: "Again", tone: "rose" },
  { label: "Hard", tone: "amber" },
  { label: "Good", tone: "leaf" },
  { label: "Easy", tone: "sky" },
];

const timeAgo = (iso) => {
  const mins = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60000),
  );
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
};

export default function Home() {
  const { user } = useAuth();
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
      <PageTitle right={<CreateMenu />}>Welcome back</PageTitle>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass rounded-3xl p-7">
          <p className="text-mist">Today</p>
          <p className="mt-1 text-6xl font-extrabold">
            {data.todayCount}
            <span className="ml-3 text-xl font-semibold text-mist">
              cards to review
            </span>
          </p>
          <div className="mt-6">
            {data.todayCount > 0 ? (
              <Link
                to="/flashcards/study/all"
                className={btnClass("primary", "px-8 py-3.5")}
              >
                Start studying
              </Link>
            ) : data.hasDecks ? (
              <p className="text-mist">You are all caught up for today.</p>
            ) : (
              <Link
                to="/create-deck"
                className={btnClass("primary", "px-8 py-3.5")}
              >
                Create your first deck
              </Link>
            )}
          </div>
        </div>

        <div className="glass rounded-3xl p-7">
          <div className="flex items-baseline justify-between">
            <p className="text-mist">Last 7 days</p>
            <p className="text-sm">
              <span className="text-xl font-extrabold text-leaf">
                {data.streak}
              </span>{" "}
              day streak
            </p>
          </div>
          <div
            className="mt-5 flex h-24 items-end gap-2"
            role="img"
            aria-label="Reviews per day for the last 7 days"
          >
            {data.days.map((d, i) => (
              <div
                key={i}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <div
                  className={`w-full rounded-md ${d.count ? "bg-leaf" : "bg-white/10"}`}
                  style={{ height: `${Math.max(6, (d.count / max) * 64)}px` }}
                  title={`${d.count} reviews`}
                />
                <span className="text-[11px] text-mist">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">Recent decks</h2>
          <Link to="/flashcards" className="text-sm text-leaf underline">
            See all decks
          </Link>
        </div>
        {data.recentDecks.length === 0 ? (
          <p className="text-mist">No decks yet. Your library is empty.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {data.recentDecks.map((d) => (
              <DeckTile key={d.id} deck={d} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-extrabold">Recent words</h2>
        {data.words.length === 0 ? (
          <p className="text-mist">Words you study will show up here.</p>
        ) : (
          <ul className="glass divide-y divide-white/10 rounded-3xl">
            {data.words.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
              >
                <div>
                  <p className="text-lg font-bold">{w.cards?.term}</p>
                  {w.cards?.translation && (
                    <p className="text-sm text-mist">{w.cards.translation}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={RATING[w.rating].tone}>
                    {RATING[w.rating].label}
                  </Badge>
                  <span className="text-xs text-mist">
                    {timeAgo(w.reviewed_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-mist">Signed in as {user?.email}</p>
    </div>
  );
}
