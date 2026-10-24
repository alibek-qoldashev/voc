import { Link } from "react-router-dom";
import { btnClass } from "./ui";

// Anki uslubidagi uchta hisob
function Counts({ deck }) {
  const items = [
    { label: "New", value: deck.newCount ?? 0, cls: "text-sky" },
    { label: "Learn", value: deck.learnCount ?? 0, cls: "text-rose" },
    { label: "Due", value: deck.dueCount ?? 0, cls: "text-[#8fe36b]" },
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

export default function DeckTile({ deck }) {
  const ready =
    (deck.newCount ?? 0) + (deck.learnCount ?? 0) + (deck.dueCount ?? 0);
  return (
    <div className="glass flex h-full flex-col gap-4 rounded-3xl p-5">
      <Link to={`/flashcards/deck/${deck.id}`} className="block flex-1">
        <h3 className="text-xl font-bold leading-snug">{deck.name}</h3>
        {deck.description && (
          <p className="mt-1 line-clamp-2 text-sm text-mist">
            {deck.description}
          </p>
        )}
        <Counts deck={deck} />
        <p className="mt-3 text-xs text-mist">{deck.total} terms in total</p>
      </Link>
      {ready > 0 ? (
        <Link
          to={`/flashcards/deck/${deck.id}`}
          className={btnClass("primary", "w-full")}
        >
          Study
        </Link>
      ) : (
        <span className="text-center text-sm text-mist">
          {deck.total ? "All caught up" : "Add your first terms"}
        </span>
      )}
    </div>
  );
}
