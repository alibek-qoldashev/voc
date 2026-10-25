import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  addCards,
  deleteCard,
  deleteDeck,
  getCards,
  getDeck,
  updateCard,
} from "../lib/api";
import { parseImport, speak } from "../lib/utils";
import CardForm from "../components/CardForm";
import FlipBoard from "../components/FlipBoard";
import ItemMenu from "../components/ItemMenu";
import { MODES } from "../lib/modes";
import {
  Badge,
  Btn,
  CardImage,
  ErrorBox,
  Field,
  Spinner,
  SpeakIcon,
  fieldCls,
} from "../components/ui";
import { useLang } from "../lib/i18n";

function stateBadge(c, t) {
  if (c.srs_state === "new") return <Badge tone="sky">{t("state.new")}</Badge>;
  if (c.srs_state === "review" && c.interval_days >= 21)
    return <Badge tone="leaf">{t("state.mastered")}</Badge>;
  if (new Date(c.due) <= new Date())
    return <Badge tone="amber">{t("state.due")}</Badge>;
  return <Badge>{t("state.scheduled")}</Badge>;
}

function ModeTiles({ deckId, count, ready }) {
  const { t } = useLang();
  return (
    <ul className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {MODES.map((m) => {
        const enough = count >= m.min;
        const inner = (
          <>
            <span className={`flex items-center gap-2 ${m.color}`}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {m.icon.map((p) => (
                  <path key={p} d={p} />
                ))}
              </svg>
              <span className="text-lg font-bold text-white">
                {t(`mode.${m.id}`)}
              </span>
              {m.id === "standard" && ready > 0 && (
                <Badge tone="sky">{ready}</Badge>
              )}
            </span>
            <span className="mt-1 block text-xs text-mist">
              {enough
                ? t(`mode.${m.id}.text`)
                : t("mode.needs", { count: m.min })}
            </span>
          </>
        );
        return (
          <li key={m.id}>
            {enough ? (
              <Link
                to={`/flashcards/study/${deckId}/${m.id}`}
                className="glass block h-full rounded-2xl px-4 py-4 transition-colors hover:border-white/40"
              >
                {inner}
              </Link>
            ) : (
              <div className="glass h-full cursor-not-allowed rounded-2xl px-4 py-4 opacity-40">
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Tahrir rejimidagi bitta karta
function EditRow({ card, selected, onToggle, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState(card);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const { t } = useLang();

  if (editing) {
    return (
      <li className="glass rounded-2xl p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("card.term")}>
            <input
              autoFocus
              className={fieldCls}
              value={f.term}
              onChange={set("term")}
            />
          </Field>
          <Field label={t("card.translation")}>
            <input
              className={fieldCls}
              value={f.translation || ""}
              onChange={set("translation")}
            />
          </Field>
          <Field label={t("card.definition")}>
            <input
              className={fieldCls}
              value={f.definition || ""}
              onChange={set("definition")}
            />
          </Field>
          <Field label={t("card.example")}>
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
            {t("common.save")}
          </Btn>
          <Btn
            variant="glass"
            onClick={() => {
              setF(card);
              setEditing(false);
            }}
          >
            {t("common.cancel")}
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
          aria-label={t("deck.select", { term: card.term })}
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
            {t("common.edit")}
          </Btn>
          <Btn variant="danger" className="!px-4 !py-1.5" onClick={onDelete}>
            {t("common.delete")}
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
  const [quickAdd, setQuickAdd] = useState(false);
  const [notice, setNotice] = useState("");
  const { t } = useLang();

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
    if (!window.confirm(t("deck.deleteCard", { term }))) return;
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
        t("deck.deleteSelected", { count: selected.size }),
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

  // Pastdagi "Add card" formasidan
  const addFromForm = async (f) => {
    const [row] = await addCards(deckId, [f]);
    setCards((cs) => [...cs, row]);
    setQuickAdd(false);
  };

  const addBulk = async () => {
    const parsed = parseImport(bulk);
    if (!parsed.length)
      return setError(t("import.lineError"));
    try {
      const rows = await addCards(deckId, parsed);
      setCards((cs) => [...cs, ...rows]);
      setBulk("");
      setBulkOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleEdit = () => {
    setEditMode((v) => !v);
    setSelected(new Set());
    setAdding(false);
    setQuickAdd(false);
  };

  // Telefonlarda tizimning ulashish oynasi, boshqa joyda havolani nusxalash
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: deck.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        setNotice(t("deck.linkCopied"));
        setTimeout(() => setNotice(""), 2000);
      }
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    }
  };

  const removeDeck = async () => {
    if (
      !window.confirm(
        t("decks.deleteConfirm", { name: deck.name, count: cards.length }),
      )
    )
      return;
    try {
      await deleteDeck(deckId);
      navigate("/flashcards");
    } catch (e) {
      setError(e.message);
    }
  };

  const setDraftField = (k) => (e) =>
    setDraft({ ...draft, [k]: e.target.value });

  return (
    <div >
      <Link to="/flashcards" className="text-sm text-mist hover:text-leaf">
        ← {t("nav.flashcards")}
      </Link>

      <div className="mb-8 mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{deck.name}</h1>
          {deck.description && (
            <p className="mt-1 text-mist">{deck.description}</p>
          )}
          <p className="mt-2 text-sm text-mist">
            {t("count.terms", { count: cards.length })}
          </p>
        </div>
        {editMode ? (
          <Btn onClick={toggleEdit}>{t("common.done")}</Btn>
        ) : (
          <ItemMenu
            label={t("common.optionsFor", { name: deck.name })}
            buttonClassName="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10"
            items={[
              { label: t("common.edit"), onClick: toggleEdit },
              { label: t("deck.share"), onClick: share },
              { label: t("common.delete"), onClick: removeDeck, danger: true },
            ]}
          />
        )}
      </div>

      {notice && (
        <p role="status" className="mb-4 text-sm text-[#8fe36b]">
          {notice}
        </p>
      )}

      <ErrorBox>{error}</ErrorBox>

      {cards.length > 0 && !editMode && (
        <div className="mb-10">
          <ModeTiles deckId={deckId} count={cards.length} ready={readyCount} />
          <FlipBoard deckId={deckId} cards={cards} onSave={saveCard} />
        </div>
      )}

      {/* Tahrir paneli */}
      {editMode && (
        <section className="glass mb-6 rounded-3xl p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Btn onClick={() => setAdding((v) => !v)}>
              {adding ? t("common.close") : t("deck.addCard")}
            </Btn>
            <Btn variant="glass" onClick={() => setBulkOpen((v) => !v)}>
              {bulkOpen ? t("import.close") : t("import.open")}
            </Btn>
            <Btn
              variant="danger"
              disabled={selected.size === 0}
              onClick={removeSelected}
            >
              {t("deck.deleteSelectedBtn", { n: selected.size })}
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
                  ? t("deck.clearSelection")
                  : t("deck.selectAll")}
              </button>
            )}
          </div>

          {adding && (
            <form
              onSubmit={addOne}
              className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2"
            >
              <Field label={t("card.term")}>
                <input
                  autoFocus
                  className={fieldCls}
                  value={draft.term}
                  onChange={setDraftField("term")}
                  placeholder="mitigate"
                />
              </Field>
              <Field label={t("card.translationUz")}>
                <input
                  className={fieldCls}
                  value={draft.translation}
                  onChange={setDraftField("translation")}
                  placeholder="yengillashtirmoq"
                />
              </Field>
              <Field label={t("card.definition")}>
                <input
                  className={fieldCls}
                  value={draft.definition}
                  onChange={setDraftField("definition")}
                  placeholder="to make something less severe"
                />
              </Field>
              <Field label={t("card.example")}>
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
                  {t("deck.addCard")}
                </Btn>
              </div>
            </form>
          )}

          {bulkOpen && (
            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="text-sm text-mist">
                {t("import.perLine")}{" "}
                <code className="rounded bg-white/10 px-1">
                  term ; definition ; translation ; example
                </code>
              </p>
              <textarea
                autoFocus
                className={`${fieldCls} mt-3 h-36 font-mono`}
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                aria-label={t("import.open")}
                placeholder={"mitigate ; to make something less severe"}
              />
              <div className="mt-3">
                <Btn onClick={addBulk} disabled={!bulk.trim()}>
                  {t("deck.addAll")}
                </Btn>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold">{t("deck.cards")}</h2>
        {cards.length > 0 && (
          <input
            className={`${fieldCls} max-w-xs`}
            placeholder={t("common.search")}
            aria-label={t("deck.searchCards")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
      </div>

      {cards.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center">
          <p className="text-xl font-bold">{t("deck.noCards")}</p>
          <p className="mt-1 text-mist">
            {t("deck.noCardsHint")}
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
                        aria-label={t("common.listenTo", { term: c.term })}
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
                  {(c.term_image || c.definition_image) && (
                    <div className="flex gap-2">
                      {[c.term_image, c.definition_image].map(
                        (src) =>
                          src && (
                            <CardImage
                              key={src}
                              src={src}
                              className="h-14 w-14 object-cover"
                            />
                          ),
                      )}
                    </div>
                  )}
                  {stateBadge(c, t)}
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {cards.length > 0 && shown.length === 0 && (
        <p className="mt-3 text-mist">{t("common.noMatch", { query })}</p>
      )}

      {/* Pastdagi Add card */}
      {!editMode &&
        (quickAdd ? (
          <section className="glass mt-6 rounded-3xl p-6">
            <h2 className="mb-4 text-lg font-bold">{t("deck.newCard")}</h2>
            <CardForm
              submitLabel={t("deck.addCard")}
              onSubmit={addFromForm}
              onCancel={() => setQuickAdd(false)}
            />
          </section>
        ) : (
          <Btn
            variant="glass"
            className="mt-6 w-full"
            onClick={() => setQuickAdd(true)}
          >
            + {t("deck.addCard")}
          </Btn>
        ))}
    </div>
  );
}
