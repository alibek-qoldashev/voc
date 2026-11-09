import { useState } from "react";
import {
  addCards,
  deleteCard,
  getCards,
  setCardPosition,
  updateCard,
  updateDeck,
  uploadCardImage,
} from "../lib/api";
import { parseImport } from "../lib/utils";
import { useLang } from "../lib/i18n";
import { BackBtn, Btn, ErrorBox, Icon, Spinner, fieldCls } from "./ui";
import { ICONS, Side } from "./CardSides";

const SWAP = ["M7 7h13", "m16 3 4 4-4 4", "M17 17H4", "m8 21-4-4 4-4"];

const newKey = () => Math.random().toString(36).slice(2);
// Rasm: { url } — saqlangan, { file, preview } — yangi tanlangan
const imgOf = (url) => (url ? { url, preview: url } : null);
const rowOf = (c) => ({
  key: c.id,
  id: c.id,
  term: c.term,
  definition: c.definition || "",
  translation: c.translation || "",
  example: c.example || "",
  termImg: imgOf(c.term_image),
  defImg: imgOf(c.definition_image),
});
const emptyRow = (term = "", definition = "", translation = "", example = "") => ({
  key: newKey(),
  id: null,
  term,
  definition,
  translation,
  example,
  termImg: null,
  defImg: null,
});
const urlOf = (img) => img?.url ?? null;
const sameRow = (r, c) =>
  r.term === c.term &&
  r.definition === (c.definition || "") &&
  urlOf(r.termImg) === (c.term_image || null) &&
  urlOf(r.defImg) === (c.definition_image || null);

// Deckni tahrirlash (Quizlet'dagidek): nomi, tavsifi, kartalar ro'yxati.
// O'zgarishlar Done bosilganda saqlanadi, Back esa ularni bekor qiladi
export default function DeckEditor({ deck, cards, onDone, onCancel }) {
  const { t } = useLang();
  const [name, setName] = useState(deck.name);
  const [description, setDescription] = useState(deck.description || "");
  const [rows, setRows] = useState(() =>
    cards.length ? cards.map(rowOf) : [emptyRow()],
  );
  const [importOpen, setImportOpen] = useState(false);
  const [bulk, setBulk] = useState("");
  const [dragKey, setDragKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const change = (fn) => {
    setRows(fn);
    setDirty(true);
  };
  const setRow = (key, patch) =>
    change((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeRow = (key) =>
    change((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : [emptyRow()]));
  const addRow = () => change((rs) => [...rs, emptyRow()]);

  // So'z va ta'rifni (rasmlari bilan) hamma kartada almashtirish
  const reverse = () =>
    change((rs) =>
      rs.map((r) => ({
        ...r,
        term: r.definition,
        definition: r.term,
        termImg: r.defImg,
        defImg: r.termImg,
      })),
    );

  const applyImport = () => {
    const parsed = parseImport(bulk);
    if (!parsed.length) return setError(t("import.lineError"));
    change((rs) => [
      ...rs.filter((r) => r.id || r.term.trim() || r.definition.trim()),
      ...parsed.map((p) => emptyRow(p.term, p.definition, p.translation, p.example)),
    ]);
    setBulk("");
    setImportOpen(false);
    setError("");
  };

  // Surish: tutqich ostidagi qator o'rniga o'tkazamiz
  const onDragMove = (e) => {
    if (!dragKey) return;
    const over = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest("[data-row]")?.dataset.row;
    if (!over || over === dragKey) return;
    change((rs) => {
      const from = rs.findIndex((r) => r.key === dragKey);
      const to = rs.findIndex((r) => r.key === over);
      const next = [...rs];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  };

  const back = () => {
    const edited = dirty || name !== deck.name || description !== (deck.description || "");
    if (edited && !window.confirm(t("deck.discardEdits"))) return;
    onCancel();
  };

  const save = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
      // So'zi bo'sh qatorlar saqlanmaydi (avval saqlangan bo'lsa — o'chiriladi)
      const kept = rows.filter((r) => r.term.trim());
      const keptIds = new Set(kept.filter((r) => r.id).map((r) => r.id));
      const upload = async (img) =>
        img?.file ? uploadCardImage(img.file) : urlOf(img);
      const withImages = await Promise.all(
        kept.map(async (r) => ({
          ...r,
          term_image: await upload(r.termImg),
          definition_image: await upload(r.defImg),
        })),
      );

      const jobs = [];
      if (name !== deck.name || description !== (deck.description || ""))
        jobs.push(updateDeck(deck.id, { name, description }));
      cards
        .filter((c) => !keptIds.has(c.id))
        .forEach((c) => jobs.push(deleteCard(c.id)));
      withImages
        .filter((r) => r.id && !sameRow(r, byId[r.id]))
        .forEach((r) => jobs.push(updateCard(r.id, r)));
      const fresh = withImages.filter((r) => !r.id);
      const [added] = await Promise.all([
        fresh.length ? addCards(deck.id, fresh) : Promise.resolve([]),
        ...jobs,
      ]);

      // Tartib o'zgargan bo'lsa (yoki yangi karta o'rtaga qo'yilgan bo'lsa) hammasiga yangi o'rin
      let n = 0;
      const finalIds = withImages.map((r) => r.id ?? added[n++].id);
      const oldOrder = cards.filter((c) => keptIds.has(c.id)).map((c) => c.id);
      const naturalOrder = [...oldOrder, ...added.map((c) => c.id)];
      if (finalIds.join() !== naturalOrder.join()) {
        const base = Date.now() / 1000;
        await Promise.all(finalIds.map((id, i) => setCardPosition(id, base + i / 1000)));
      }

      const fresher = await getCards(deck.id);
      onDone({ ...deck, name: name.trim(), description: description.trim() }, fresher);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  if (busy) return <Spinner label={t("deck.saving")} />;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <BackBtn onClick={back}>{t("common.back")}</BackBtn>
        <Btn onClick={save} disabled={!name.trim()}>
          {t("common.done")}
        </Btn>
      </div>

      <ErrorBox>{error}</ErrorBox>

      <section className="space-y-3">
        <label className="block rounded-2xl bg-white/[0.07] px-5 py-3">
          <span className="block text-xs font-semibold text-mist">{t("deck.editTitle")}</span>
          <input
            className="mt-1 w-full bg-transparent text-lg font-bold text-white placeholder:text-mist/70 focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("createDeck.namePh")}
          />
        </label>
        <input
          className="w-full rounded-2xl bg-white/[0.07] px-5 py-4 text-white placeholder:text-mist/80"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("deck.addDescription")}
          aria-label={t("deck.addDescription")}
        />
      </section>

      <div className="my-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setImportOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 font-bold text-white transition-colors hover:bg-white/15"
        >
          <Icon d={ICONS.plus} size={18} />
          {t("import.open")}
        </button>
        <button
          type="button"
          onClick={reverse}
          title={t("deck.reverse")}
          aria-label={t("deck.reverse")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
        >
          <Icon d={SWAP} size={20} />
        </button>
      </div>

      {importOpen && (
        <div className="glass mb-5 rounded-3xl p-5">
          <p className="text-sm text-mist">
            {t("import.perLine")}{" "}
            <code className="rounded bg-white/10 px-1">term ; definition</code>.{" "}
            {t("import.separators")}
          </p>
          <textarea
            autoFocus
            className={`${fieldCls} mt-3 h-44 font-mono`}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={"mitigate ; to make something less severe"}
            aria-label={t("import.manual")}
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <Btn onClick={applyImport} disabled={!bulk.trim()}>
              {t("import.addThese")}
            </Btn>
            <Btn variant="glass" onClick={() => setImportOpen(false)}>
              {t("common.cancel")}
            </Btn>
          </div>
        </div>
      )}

      <ul className="space-y-4">
        {rows.map((r, i) => (
          <li
            key={r.key}
            data-row={r.key}
            className={`rounded-3xl bg-white/[0.07] p-5 transition-shadow ${
              dragKey === r.key ? "ring-2 ring-leaf" : ""
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-lg font-bold">{i + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={t("createDeck.drag")}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDragKey(r.key);
                  }}
                  onPointerMove={onDragMove}
                  onPointerUp={() => setDragKey(null)}
                  onPointerCancel={() => setDragKey(null)}
                  className="cursor-grab touch-none rounded-lg p-2 text-white hover:bg-white/10 active:cursor-grabbing"
                >
                  <Icon d={ICONS.handle} size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => removeRow(r.key)}
                  aria-label={t("createDeck.removeRow", { n: i + 1 })}
                  className="rounded-lg p-2 text-mist hover:bg-white/10 hover:text-rose"
                >
                  <Icon d={ICONS.trash} size={18} />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
              <Side
                imageFirst
                value={r.term}
                onChange={(e) => setRow(r.key, { term: e.target.value })}
                placeholder={t("createDeck.enterTerm")}
                label={t("card.term")}
                image={r.termImg}
                onImage={(img) => setRow(r.key, { termImg: img })}
              />
              <Side
                value={r.definition}
                onChange={(e) => setRow(r.key, { definition: e.target.value })}
                placeholder={t("createDeck.enterDef")}
                label={t("card.definition")}
                image={r.defImg}
                onImage={(img) => setRow(r.key, { defImg: img })}
              />
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addRow}
        className="mt-4 w-full rounded-3xl border-2 border-dashed border-white/20 py-5 font-bold text-mist transition-colors hover:border-leaf hover:text-leaf"
      >
        + {t("deck.addACard")}
      </button>
    </div>
  );
}
