import { useEffect, useRef, useState } from "react";
import { useLang } from "../lib/i18n";
import { Icon } from "./ui";

export const SORTS = ["name", "created", "size"];

// Mahkamlanganlar doim tepada, qolgani tanlangan tartibda
export function sortDecks(decks, by) {
  const cmp = {
    name: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    created: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    size: (a, b) => (b.total ?? 0) - (a.total ?? 0),
  }[by];
  return [...decks].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || cmp(a, b));
}

// Qidiruv yonidagi saralash tugmasi
export default function SortMenu({ value, onChange }) {
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("sort.label", { by: t(`sort.${value}`) })}
        title={t("sort.label", { by: t(`sort.${value}`) })}
        className="flex h-[46px] w-[46px] items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10"
      >
        <Icon d={["M7 4v16", "m3 8 4-4 4 4", "M17 20V4", "m13 16 4 4 4-4"]} size={20} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#141831] p-1.5"
        >
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-mist">
            {t("sort.title")}
          </p>
          {SORTS.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitemradio"
              aria-checked={value === s}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-white/10 ${
                value === s ? "text-leaf" : "text-white"
              }`}
            >
              {t(`sort.${s}`)}
              {value === s && <Icon d={["M20 6 9 17l-5-5"]} size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
