import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  addCards,
  deleteCard,
  getCards,
  getDeck,
  updateCard,
} from "../lib/api";
import { parseImport, speak } from "../lib/utils";
import {
  Badge,
  Btn,
  ErrorBox,
  Field,
  Spinner,
  SpeakIcon,
  fieldCls,
} from "../components/ui";

function stateBadge(c) {
  if (c.srs_state === "new") return <Badge tone="sky">New</Badge>;
  if (c.srs_state === "review" && c.interval_days >= 21)
    return <Badge tone="leaf">Mastered</Badge>;
  if (new Date(c.due) <= new Date()) return <Badge tone="amber">Due</Badge>;
  return <Badge>Scheduled</Badge>;
}

const MODES = [
  {
    id: "standard",
    title: "Standard",
    text: "Flip each card and rate it Again, Hard, Good or Easy. Intervals grow as you remember.",
    min: 1,
  },
  {
    id: "match",
    title: "Match",
    text: "Race the clock pairing every term with its definition.",
    min: 3,
  },
  {
    id: "test",
    title: "Test",
    text: "Multiple choice questions drawn from this deck.",
    min: 4,
  },
  {
    id: "write",
    title: "Writing",
    text: "Read the definition and type the term from memory.",
    min: 1,
  },
];

// Tahrir rejimidagi bitta karta
function EditRow({ card, selected, onToggle, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState(card);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (editing) {
    return (
      <li className="glass rounded-2xl p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Term">
            <input
              autoFocus
              className={fieldCls}
              value={f.term}
              onChange={set("term")}
            />
          </Field>
          <Field label="Translation">
            <input
              className={fieldCls}
              value={f.translation || ""}
              onChange={set("translation")}
            />
          </Field>
          <Field label="Definition">
            <input
              className={fieldCls}
              value={f.definition || ""}
              onChange={set("definition")}
            />
          </Field>
          <Field label="Example">
            <input
              className={fieldCls}
              value={f.example || ""}
              onChange={set("example")}
            />
          </Field>
        </div>
        <div className="mt-4 flex gap-3">
          <Btn
            onClick={async () => {
              await onSave(f);
              setEditing(false);
            }}
            disabled={!f.term.trim()}
          >
            Save
          </Btn>
          <Btn
            variant="glass"
            onClick={() => {
              setF(card);
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
    <li className={`glass rounded-2xl p-5 ${selected ? "border-leaf/60" : ""}`}>
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${card.term}`}
          className="mt-1.5 h-5 w-5 shrink-0 accent-[#55b435]"
        />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold">{card.term}</p>
          {card.translation && (
            <p className="text-sm font-semibold text-[#8fe36b]">
              {card.translation}
            </p>
          )}
          {card.definition && <p className="mt-1 text-sm">{card.definition}</p>}
          {card.example && (
            <p className="mt-1 text-sm italic text-mist">{card.example}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Btn
            variant="glass"
            className="!px-4 !py-1.5"
            onClick={() => setEditing(true)}
          >
            Edit
          </Btn>
          <Btn variant="danger" className="!px-4 !py-1.5" onClick={onDelete}>
            Delete
          </Btn>
        </div>
      </div>
    </li>
  );
}

export default function DeckDetail() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    term: "",
    translation: "",
    definition: "",
    example: "",
  });
  const [bulk, setBulk] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    Promise.all([getDeck(deckId), getCards(deckId)])
      .then(([d, c]) => {
        setDeck(d);
        setCards(c);
      })
      .catch((e) => setError(e.message));
  }, [deckId]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? cards.filter((c) =>
          [c.term, c.definition, c.translation].some((t) =>
            (t || "").toLowerCase().includes(q),
          ),
        )
      : cards;
  }, [cards, query]);

  if (error && !deck) return <ErrorBox>{error}</ErrorBox>;
  if (!deck) return <Spinner />;

  const readyCount = cards.filter(
    (c) => c.srs_state === "new" || new Date(c.due) <= new Date(),
  ).length;

  const toggle = (id) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const removeOne = async (id, term) => {
    if (!window.confirm(`Delete "${term}"?`)) return;
    try {
      await deleteCard(id);
      setCards((cs) => cs.filter((c) => c.id !== id));
      setSelected((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    } catch (e) {
      setError(e.message);
    }
  };

  const removeSelected = async () => {
    if (
      !window.confirm(
        `Delete ${selected.size} selected card${selected.size === 1 ? "" : "s"}?`,
      )
    )
      return;
    try {
      await Promise.all([...selected].map((id) => deleteCard(id)));
      setCards((cs) => cs.filter((c) => !selected.has(c.id)));
      setSelected(new Set());
    } catch (e) {
      setError(e.message);
    }
  };

  const saveCard = async (f) => {
    try {
      const row = await updateCard(f.id, f);
      setCards((cs) => cs.map((c) => (c.id === f.id ? row : c)));
    } catch (e) {
      setError(e.message);
    }
  };

  const addOne = async (e) => {
    e.preventDefault();
    if (
      !draft.term.trim() ||
      (!draft.definition.trim() && !draft.translation.trim())
    )
      return;
    try {
      const [row] = await addCards(deckId, [draft]);
      setCards((cs) => [...cs, row]);
      setDraft({ term: "", translation: "", definition: "", example: "" });
    } catch (err) {
      setError(err.message);
    }
  };

  const addBulk = async () => {
    const parsed = parseImport(bulk);
    if (!parsed.length)
      return setError('Each line needs at least "term ; definition".');
    try {
      const rows = await addCards(deckId, parsed);
      setCards((cs) => [...cs, ...rows]);
      setBulk("");
      setBulkOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const setDraftField = (k) => (e) =>
    setDraft({ ...draft, [k]: e.target.value });

  return (
    <div >
      <Link to="/flashcards" className="text-sm text-mist hover:text-leaf">
        ← Flashcards
      </Link>

      <div className="mb-8 mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{deck.name}</h1>
          {deck.description && (
            <p className="mt-1 text-mist">{deck.description}</p>
          )}
          <p className="mt-2 text-sm text-mist">{cards.length} terms</p>
        </div>
        <Btn
          variant={editMode ? "primary" : "glass"}
          onClick={() => {
            setEditMode((v) => !v);
            setSelected(new Set());
            setAdding(false);
          }}
        >
          {editMode ? "Done" : "Edit"}
        </Btn>
      </div>

      <ErrorBox>{error}</ErrorBox>

      {/* Tahrir paneli */}
      {editMode && (
        <section className="glass mb-6 rounded-3xl p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Btn onClick={() => setAdding((v) => !v)}>
              {adding ? "Close" : "Add card"}
            </Btn>
            <Btn variant="glass" onClick={() => setBulkOpen((v) => !v)}>
              {bulkOpen ? "Close import" : "Import"}
            </Btn>
            <Btn
              variant="danger"
              disabled={selected.size === 0}
              onClick={removeSelected}
            >
              Delete selected ({selected.size})
            </Btn>
            {cards.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setSelected((s) =>
                    s.size === cards.length
                      ? new Set()
                      : new Set(cards.map((c) => c.id)),
                  )
                }
                className="text-sm text-mist underline hover:text-leaf"
              >
                {selected.size === cards.length
                  ? "Clear selection"
                  : "Select all"}
              </button>
            )}
          </div>

          {adding && (
            <form
              onSubmit={addOne}
              className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2"
            >
              <Field label="Term">
                <input
                  autoFocus
                  className={fieldCls}
                  value={draft.term}
                  onChange={setDraftField("term")}
                  placeholder="mitigate"
                />
              </Field>
              <Field label="Translation (Uzbek)">
                <input
                  className={fieldCls}
                  value={draft.translation}
                  onChange={setDraftField("translation")}
                  placeholder="yengillashtirmoq"
                />
              </Field>
              <Field label="Definition">
                <input
                  className={fieldCls}
                  value={draft.definition}
                  onChange={setDraftField("definition")}
                  placeholder="to make something less severe"
                />
              </Field>
              <Field label="Example">
                <input
                  className={fieldCls}
                  value={draft.example}
                  onChange={setDraftField("example")}
                  placeholder="Trees help mitigate pollution."
                />
              </Field>
              <div className="sm:col-span-2">
                <Btn
                  type="submit"
                  disabled={
                    !draft.term.trim() ||
                    (!draft.definition.trim() && !draft.translation.trim())
                  }
                >
                  Add card
                </Btn>
              </div>
            </form>
          )}

          {bulkOpen && (
            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="text-sm text-mist">
                One card per line:{" "}
                <code className="rounded bg-white/10 px-1">
                  term ; definition ; translation ; example
                </code>
              </p>
              <textarea
                autoFocus
                className={`${fieldCls} mt-3 h-36 font-mono`}
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                aria-label="Import cards"
                placeholder={"mitigate ; to make something less severe"}
              />
              <div className="mt-3">
                <Btn onClick={addBulk} disabled={!bulk.trim()}>
                  Add all
                </Btn>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold">Cards</h2>
        {cards.length > 0 && (
          <input
            className={`${fieldCls} max-w-xs`}
            placeholder="Search"
            aria-label="Search cards"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
      </div>

      {cards.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center">
          <p className="text-xl font-bold">No cards yet</p>
          <p className="mt-1 text-mist">
            Tap Edit, then Add card to put your first term here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((c) =>
            editMode ? (
              <EditRow
                key={c.id}
                card={c}
                selected={selected.has(c.id)}
                onToggle={() => toggle(c.id)}
                onSave={saveCard}
                onDelete={() => removeOne(c.id, c.term)}
              />
            ) : (
              <li key={c.id} className="glass rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold">{c.term}</p>
                      <button
                        type="button"
                        onClick={() => speak(c.term)}
                        aria-label={`Listen to ${c.term}`}
                        className="rounded-lg p-1 text-mist hover:bg-white/10 hover:text-white"
                      >
                        <SpeakIcon />
                      </button>
                    </div>
                    {c.translation && (
                      <p className="text-sm font-semibold text-[#8fe36b]">
                        {c.translation}
                      </p>
                    )}
                    {c.definition && (
                      <p className="mt-1 text-sm">{c.definition}</p>
                    )}
                    {c.example && (
                      <p className="mt-1 text-sm italic text-mist">
                        {c.example}
                      </p>
                    )}
                  </div>
                  {stateBadge(c)}
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {cards.length > 0 && shown.length === 0 && (
        <p className="mt-3 text-mist">Nothing matches "{query}".</p>
      )}

      {/* Pastdagi Study tugmasi */}
      {cards.length > 0 && !editMode && (
        <div className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-white/10 bg-night/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 md:-mx-2 md:px-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-mist">
              {readyCount} card{readyCount === 1 ? "" : "s"} ready to review
            </p>
            <Btn className="px-10 py-3.5" onClick={() => setPicking(true)}>
              Study
            </Btn>
          </div>
        </div>
      )}

      {/* O'quv turini tanlash */}
      {picking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setPicking(false)}
            className="absolute inset-0 cursor-default"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mode-title"
            className="glass relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6 sm:p-8"
          >
            <h2 id="mode-title" className="text-2xl font-extrabold">
              How do you want to study?
            </h2>
            <ul className="mt-6 space-y-3">
              {MODES.map((m) => {
                const enough = cards.length >= m.min;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      disabled={!enough}
                      onClick={() =>
                        navigate(`/flashcards/study/${deckId}/${m.id}`)
                      }
                      className="w-full rounded-2xl border border-white/15 p-4 text-left transition-colors hover:border-leaf disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <p className="font-bold">{m.title}</p>
                      <p className="mt-1 text-sm text-mist">
                        {enough ? m.text : `Needs at least ${m.min} cards.`}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6">
              <Btn variant="glass" onClick={() => setPicking(false)}>
                Cancel
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
