import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  addCards,
  createDeck,
  extractWordsFromPhoto,
  uploadCardImage,
} from "../lib/api";
import { parseImport } from "../lib/utils";
import { Btn, ErrorBox, Field, Icon, Spinner, fieldCls } from "../components/ui";
import { useLang } from "../lib/i18n";

const emptyRow = (term = "", definition = "") => ({
  key: Math.random().toString(36).slice(2),
  term,
  definition,
  termImg: null, // { file, preview }
  defImg: null,
});

const ICONS = {
  image: ["M4 5h16v14H4z", "m4 16 5-5 4 4 2-2 5 5", "M15.5 9.5h.01"],
  handle: ["M5 9h14", "M5 15h14"],
  trash: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 13h10l1-13", "M9 7V4h6v3"],
  plus: ["M12 5v14", "M5 12h14"],
  text: ["M4 6h16", "M4 12h16", "M4 18h10"],
  camera: [
    "M4 8h3l2-3h6l2 3h3v11H4z",
    "M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  ],
  close: ["M18 6 6 18", "m6 6 12 12"],
};

// Kartaning bir tomoni uchun rasm tanlash katagi
function ImagePicker({ image, onChange, label }) {
  const { t } = useLang();
  const inputRef = useRef(null);

  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file?.type.startsWith("image/")) {
      onChange({ file, preview: URL.createObjectURL(file) });
    }
  };

  return (
    <div className="relative shrink-0">
      {image ? (
        <>
          <img
            src={image.preview}
            alt=""
            className="h-14 w-16 rounded-xl border border-white/15 object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={t("createDeck.removeImage", { side: label })}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-night text-white ring-1 ring-white/20 hover:bg-rose"
          >
            <Icon d={ICONS.close} size={14} />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label={t("createDeck.addImage", { side: label })}
          className="flex h-14 w-16 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-white/40 text-[11px] font-semibold text-white/90 transition-colors hover:border-leaf hover:text-leaf"
        >
          <Icon d={ICONS.image} size={18} />
          {t("card.image")}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={pick}
      />
    </div>
  );
}

function Side({ value, onChange, placeholder, label, image, onImage, imageFirst }) {
  const picker = <ImagePicker image={image} onChange={onImage} label={label} />;
  return (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      {imageFirst && picker}
      <label className="block min-w-0 flex-1">
        <input
          className="w-full rounded-xl border border-transparent bg-night/80 px-4 py-3.5 text-base text-white placeholder:text-mist/70 focus:border-leaf"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
        <span className="mt-2 block px-1 text-[11px] font-semibold uppercase tracking-wider text-mist">
          {label}
        </span>
      </label>
      {!imageFirst && picker}
    </div>
  );
}

function ImportMenu({ onManual, onPhoto, disabled }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Photo hozircha o'chiq: AI chaqiruvlari uchun foydalanuvchi limiti qo'yilgach yoqiladi
  const options = [
    { id: "manual", icon: ICONS.text, run: onManual },
    { id: "photo", icon: ICONS.camera, run: onPhoto, upcoming: true },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 font-bold text-white transition-colors hover:bg-white/15 disabled:opacity-40"
      >
        <Icon d={ICONS.plus} size={18} />
        {t("import.open")}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#141831] p-1.5"
        >
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitem"
              disabled={o.upcoming}
              aria-disabled={o.upcoming}
              onClick={() => {
                setOpen(false);
                o.run();
              }}
              className="relative flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/10 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <span
                className={`flex items-start gap-3 ${
                  o.upcoming ? "opacity-40 blur-[1.5px] grayscale" : ""
                }`}
              >
                <span className="mt-0.5 text-leaf">
                  <Icon d={o.icon} size={20} />
                </span>
                <span>
                  <span className="block font-semibold">{t(`import.${o.id}`)}</span>
                  <span className="block text-xs text-mist">
                    {t(`import.${o.id}Hint`)}
                  </span>
                </span>
              </span>
              {o.upcoming && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  {t("import.upcoming")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreateDeck() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const folderId = params.get("folder");
  const { t } = useLang();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const [manualOpen, setManualOpen] = useState(false);
  const [bulk, setBulk] = useState("");
  const [reading, setReading] = useState(false);
  const [note, setNote] = useState("");
  const [dragKey, setDragKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const photoRef = useRef(null);

  const setRow = (key, patch) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addRow = () => setRows((rs) => [...rs, emptyRow()]);
  const removeRow = (key) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));

  // Bo'sh qatorlarni olib tashlab, yangi so'zlarni oxiriga qo'shadi
  const appendWords = (words) =>
    setRows((rs) => [
      ...rs.filter(
        (r) => r.term.trim() || r.definition.trim() || r.termImg || r.defImg,
      ),
      ...words.map((w) => emptyRow(w.term, w.definition)),
    ]);

  const applyManual = () => {
    const parsed = parseImport(bulk);
    if (!parsed.length) return setError(t("import.lineError"));
    appendWords(
      parsed.map((p) => ({
        term: p.term,
        definition: p.definition || p.translation,
      })),
    );
    setBulk("");
    setManualOpen(false);
    setError("");
  };

  const importPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError(t("profile.notImage"));
    setReading(true);
    setError("");
    setNote("");
    try {
      const words = await extractWordsFromPhoto(file);
      if (!words.length) {
        setError(t("import.none"));
      } else {
        appendWords(words);
        setNote(t("import.added", { count: words.length }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setReading(false);
    }
  };

  // Surish: tutqichni bosib, barmoq/sichqoncha ostidagi qator o'rniga o'tkazamiz
  const onDragMove = (e) => {
    if (!dragKey) return;
    const over = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest("[data-row]")?.dataset.row;
    if (!over || over === dragKey) return;
    setRows((rs) => {
      const from = rs.findIndex((r) => r.key === dragKey);
      const to = rs.findIndex((r) => r.key === over);
      const next = [...rs];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  };

  const filled = rows.filter((r) => r.term.trim() && r.definition.trim());

  const save = async (practice) => {
    if (!name.trim() || busy) return;
    if (!filled.length) return setError(t("createDeck.needCard"));
    setBusy(true);
    setError("");
    try {
      const cards = await Promise.all(
        filled.map(async (r) => ({
          term: r.term,
          definition: r.definition,
          term_image: r.termImg ? await uploadCardImage(r.termImg.file) : null,
          definition_image: r.defImg
            ? await uploadCardImage(r.defImg.file)
            : null,
        })),
      );
      const deck = await createDeck(name, description, folderId);
      await addCards(deck.id, cards);
      navigate(
        practice
          ? `/flashcards/study/${deck.id}/learn`
          : `/flashcards/deck/${deck.id}`,
      );
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (busy) return <Spinner label={t("createDeck.creating")} />;

  return (
    <div className="max-w-5xl">
      <Link
        to={folderId ? `/folders/${folderId}` : "/flashcards"}
        className="text-sm text-mist hover:text-leaf"
      >
        ← {t("page.back")}
      </Link>
      <h1 className="mt-2 text-3xl font-extrabold">{t("createDeck.title")}</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
        className="mt-8 space-y-8"
      >
        <section className="glass space-y-4 rounded-3xl p-6">
          <Field label={t("createDeck.name")}>
            <input
              autoFocus
              className={fieldCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("createDeck.namePh")}
            />
          </Field>
          <Field label={t("common.descriptionOptional")}>
            <input
              className={fieldCls}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("createDeck.descPh")}
            />
          </Field>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold">{t("createDeck.terms")}</h2>
              <p className="text-sm text-mist">
                {t("createDeck.ready", { count: filled.length })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Btn type="submit" variant="glass" disabled={!name.trim()}>
                {t("createDeck.create")}
              </Btn>
              <Btn disabled={!name.trim()} onClick={() => save(true)}>
                {t("createDeck.createPractice")}
              </Btn>
              <ImportMenu
                disabled={reading}
                onManual={() => setManualOpen(true)}
                onPhoto={() => photoRef.current?.click()}
              />
            </div>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={importPhoto}
            />
          </div>

          {error && (
            <div className="mb-5">
              <ErrorBox>{error}</ErrorBox>
            </div>
          )}

          {reading && (
            <div className="glass mb-5 rounded-3xl px-5">
              <Spinner label={t("import.reading")} />
            </div>
          )}
          {note && (
            <p
              role="status"
              className="mb-5 rounded-xl bg-leaf/15 px-4 py-3 text-sm text-[#a6ee86]"
            >
              {note}
            </p>
          )}

          {manualOpen && (
            <div className="glass mb-5 rounded-3xl p-5">
              <p className="text-sm text-mist">
                {t("import.perLine")}{" "}
                <code className="rounded bg-white/10 px-1">
                  term ; definition
                </code>
                . {t("import.separators")}
              </p>
              <textarea
                autoFocus
                className={`${fieldCls} mt-3 h-44 font-mono`}
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                placeholder={
                  "mitigate ; to make something less severe\nplausible ; seeming reasonable or likely"
                }
                aria-label={t("import.manual")}
              />
              <div className="mt-3 flex flex-wrap gap-3">
                <Btn onClick={applyManual} disabled={!bulk.trim()}>
                  {t("import.addThese")}
                </Btn>
                <Btn variant="glass" onClick={() => setManualOpen(false)}>
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
                      disabled={rows.length === 1}
                      className="rounded-lg p-2 text-mist hover:bg-white/10 hover:text-rose disabled:opacity-30"
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
                    onChange={(e) =>
                      setRow(r.key, { definition: e.target.value })
                    }
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
            className="mt-4 w-full rounded-3xl border-2 border-dashed border-white/20 py-4 text-sm font-semibold text-mist hover:border-leaf hover:text-leaf"
          >
            + {t("createDeck.addRow")}
          </button>
        </section>

      </form>
    </div>
  );
}
