import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  addCards,
  deleteDeck,
  getCards,
  getDeck,
  updateCard,
} from "../lib/api";
import { speak, withMeaning } from "../lib/utils";
import { getDeckOrigin } from "../lib/storage";
import CardForm from "../components/CardForm";
import FlipBoard from "../components/FlipBoard";
import DeckEditor from "../components/DeckEditor";
import ItemMenu from "../components/ItemMenu";
import { MODES } from "../lib/modes";
import {
  Badge,
  Btn,
  CardImage,
  ErrorBox,
  Icon,
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

function ModeTiles({ deckId, count, ready, uzCount }) {
  const { t } = useLang();
  return (
    <ul className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
      {MODES.map((m) => {
        // Tarjima: o'zbekcha tarjimasi (chiziqchadan keyin) bor kartalar bo'lmasa bosib bo'lmaydi
        const enough = m.id === "uzbek" ? uzCount >= m.min : count >= m.min;
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
                : m.id === "uzbek"
                  ? t("uzbek.none")
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

export default function DeckDetail() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searchParams] = useSearchParams();
  // Papka sahifasidagi "Edit" -> ?edit=1 bilan to'g'ridan-to'g'ri tahrir rejimida ochiladi
  const [editMode, setEditMode] = useState(searchParams.get("edit") === "1");
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

  // Papka ichidan kirilgan bo'lsa orqaga papkaga, aks holda Flashcards ro'yxatiga
  const origin = getDeckOrigin();
  const backTo = origin ? `/folders/${origin.id}` : "/flashcards";

  if (error && !deck) return <ErrorBox>{error}</ErrorBox>;
  if (!deck) return <Spinner />;

  // Tahrirlash: alohida sahifa ko'rinishi (Back, Done, nomi, tavsifi, kartalar)
  if (editMode)
    return (
      <DeckEditor
        deck={deck}
        cards={cards}
        onDone={(d, cs) => {
          setDeck(d);
          setCards(cs);
          setEditMode(false);
        }}
        onCancel={() => setEditMode(false)}
      />
    );

  const readyCount = cards.filter(
    (c) => c.srs_state === "new" || new Date(c.due) <= new Date(),
  ).length;

  const saveCard = async (f) => {
    try {
      const row = await updateCard(f.id, f);
      setCards((cs) => cs.map((c) => (c.id === f.id ? row : c)));
    } catch (e) {
      setError(e.message);
    }
  };

  // Pastdagi "Add card" formasidan
  const addFromForm = async (f) => {
    const [row] = await addCards(deckId, [f]);
    setCards((cs) => [...cs, row]);
    setQuickAdd(false);
  };

  const toggleEdit = () => {
    setEditMode((v) => !v);
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
      navigate(backTo);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div >
      {/* Tepa: chapda Back tugmasi, o'rtada nomi va so'zlar soni, o'ngda menyu */}
      <div className="mb-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <Link
          to={backTo}
          title={origin ? origin.name : t("nav.flashcards")}
          className="inline-flex items-center gap-2 justify-self-start rounded-full border border-leaf/50 bg-leaf/10 px-4 py-2.5 text-sm font-bold text-[#8fe36b] transition-colors hover:bg-leaf/20"
        >
          <Icon d={["M19 12H5", "m12 19-7-7 7-7"]} size={18} />
          {t("common.back")}
        </Link>
        <div className="min-w-0 text-center">
          <h1 className="text-3xl font-extrabold">{deck.name}</h1>
          {deck.description && (
            <p className="mt-1 text-mist">{deck.description}</p>
          )}
          <p className="mt-2 text-sm text-mist">
            {t("count.terms", { count: cards.length })}
          </p>
        </div>
        <div className="justify-self-end">
          <ItemMenu
            label={t("common.optionsFor", { name: deck.name })}
            buttonClassName="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10"
            items={[
              { label: t("common.edit"), onClick: toggleEdit },
              { label: t("deck.share"), onClick: share },
              { label: t("common.delete"), onClick: removeDeck, danger: true },
            ]}
          />
        </div>
      </div>

      {notice && (
        <p role="status" className="mb-4 text-sm text-[#8fe36b]">
          {notice}
        </p>
      )}

      <ErrorBox>{error}</ErrorBox>

      {cards.length > 0 && (
        <div className="mb-10">
          <ModeTiles
            deckId={deckId}
            count={cards.length}
            ready={readyCount}
            uzCount={withMeaning(cards, "uzbek").length}
          />
          <FlipBoard deckId={deckId} cards={cards} onSave={saveCard} />
        </div>
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
          {shown.map((c) => (
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
          ))}
        </ul>
      )}

      {cards.length > 0 && shown.length === 0 && (
        <p className="mt-3 text-mist">{t("common.noMatch", { query })}</p>
      )}

      {/* Pastdagi Add card */}
      {quickAdd ? (
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
        )}
    </div>
  );
}
