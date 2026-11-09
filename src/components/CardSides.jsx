import { useRef } from "react";
import { Icon } from "./ui";
import { useLang } from "../lib/i18n";

// Kartaning ikki tomoni (so'z va ta'rif) rasm katagi bilan.
// Yangi deck yaratish va deckni tahrirlash sahifalarida ishlatiladi

export const ICONS = {
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
export function ImagePicker({ image, onChange, label }) {
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

export function Side({ value, onChange, placeholder, label, image, onImage, imageFirst }) {
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

