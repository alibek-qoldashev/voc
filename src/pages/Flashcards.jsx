import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteDeck,
  getDecksWithStats,
  getNewLeft,
  updateDeck,
} from "../lib/api";
import CreateMenu from "../components/CreateMenu";
import DeckTile from "../components/DeckTile";
import {
  Badge,
  Btn,
  ErrorBox,
  Field,
  PageTitle,
  Spinner,
  btnClass,
  fieldCls,
} from "../components/ui";

function DeckEditRow({ deck, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(deck.name);
  const [description, setDescription] = useState(deck.description || "");
  const [busy, setBusy] = useState(false);

  if (editing) {
    return (
      <li className="glass rounded-2xl p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Deck name">
            <input
              autoFocus
              className={fieldCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Description">
            <input
              className={fieldCls}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4 flex gap-3">
          <Btn
            disabled={!name.trim() || busy}
            onClick={async () => {
              setBusy(true);
              await onSaved(deck.id, { name, description });
              setBusy(false);
              setEditing(false);
            }}
          >
            {busy ? "Saving…" : "Save"}
          </Btn>
          <Btn
            variant="glass"
            onClick={() => {
              setName(deck.name);
              setDescription(deck.description || "");
              setEditing(false);
            }}
          >
            Cancel
          </Btn>
        </div>
      </li>
    );
  }

  return (
    <li className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
      <div className="min-w-0">
        <p className="truncate text-lg font-bold">{deck.name}</p>
        {deck.description && (
          <p className="truncate text-sm text-mist">{deck.description}</p>
        )}
        <p className="mt-1 text-sm text-mist">{deck.total} terms</p>
      </div>
      <div className="flex gap-2">
        <Btn
          variant="glass"
          className="!px-4 !py-1.5"
          onClick={() => setEditing(true)}
        >
          Edit
        </Btn>
        <Btn
          variant="danger"
          className="!px-4 !py-1.5"
          onClick={() => onDeleted(deck)}
        >
          Delete
        </Btn>
      </div>
    </li>
  );
}

export default function Flashcards() {
  const [decks, setDecks] = useState(null);
  const [newLeft, setNewLeft] = useState(0);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editMode, setEditMode] = useState(false);

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

  const due = decks.reduce((s, d) => s + d.dueCount, 0);
  const learn = decks.reduce((s, d) => s + d.learnCount, 0);
  const fresh = decks.reduce((s, d) => s + d.newCount, 0);
  const today = due + learn + Math.min(newLeft, fresh);

  const q = query.trim().toLowerCase();

  const shown = decks.filter(
    (d) =>
      !q ||
      d.name.toLowerCase().includes(q) ||
      (d.description || "").toLowerCase().includes(q),
  );

  const save = async (id, fields) => {
    try {
      const row = await updateDeck(id, fields);
      setDecks((ds) => ds.map((d) => (d.id === id ? { ...d, ...row } : d)));
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (deck) => {
    if (
      !window.confirm(
        `Delete "${deck.name}" and its ${deck.total} cards? This cannot be undone.`,
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
      <PageTitle
        right={
          <div className="flex items-center gap-3">
            {decks.length > 0 && (
              <Btn
                variant={editMode ? "primary" : "glass"}
                onClick={() => setEditMode((v) => !v)}
              >
                {editMode ? "Done" : "Edit"}
              </Btn>
            )}
            <CreateMenu />
          </div>
        }
      >
        Flashcards
      </PageTitle>

      <ErrorBox>{error}</ErrorBox>

      {decks.length > 0 && !editMode && (
        <section className="glass mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl p-7">
          <div>
            <h2 className="text-2xl font-extrabold">All decks</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="sky">{Math.min(newLeft, fresh)} new</Badge>
              <Badge tone="rose">{learn} learning</Badge>
              <Badge tone="leaf">{due} due</Badge>
            </div>
          </div>
          {today > 0 ? (
            <Link
              to="/flashcards/study/all"
              className={btnClass("primary", "px-8 py-3.5")}
            >
              Study {today} cards
            </Link>
          ) : (
            <p className="text-mist">Nothing to review right now.</p>
          )}
        </section>
      )}

      {decks.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center">
          <p className="text-xl font-bold">You have no any decks yet</p>
          <p className="mt-1 text-mist">
            Use the plus button to create your first deck.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">
              {editMode ? "Edit your decks" : "Your decks"}
            </h2>
            <input
              className={`${fieldCls} max-w-xs`}
              placeholder="Search decks"
              aria-label="Search decks"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {shown.length === 0 ? (
            <p className="text-mist">Nothing matches "{query}".</p>
          ) : editMode ? (
            <ul className="space-y-3">
              {shown.map((d) => (
                <DeckEditRow
                  key={d.id}
                  deck={d}
                  onSaved={save}
                  onDeleted={remove}
                />
              ))}
            </ul>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((d) => (
                <DeckTile key={d.id} deck={d} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
