import { useState } from "react";
import { useLang } from "../lib/i18n";
import { Icon } from "./ui";

const SUN = [
  "M12 4V2",
  "M12 22v-2",
  "m4.93 4.93 1.41 1.41",
  "m17.66 17.66 1.41 1.41",
  "M2 12h2",
  "M20 12h2",
  "m6.34 17.66-1.41 1.41",
  "m19.07 4.93-1.41 1.41",
  "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
];
const MOON = ["M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"];

const current = () =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

// Qorong'i / yorug' rejim. Tanlov brauzerda saqlanadi (index.html uni sahifa ochilishida qo'yadi)
export default function ThemeToggle() {
  const { t } = useLang();
  const [theme, setTheme] = useState(current);
  const light = theme === "light";

  const toggle = () => {
    const next = light ? "dark" : "light";
    if (next === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next === "light" ? "#f3f5fb" : "#000824");
    try {
      localStorage.setItem("theme", next);
    } catch {
      // saqlab bo'lmasa ham shu sahifada ishlayveradi
    }
    setTheme(next);
  };

  const label = light ? t("theme.toDark") : t("theme.toLight");
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 transition-colors hover:bg-white/10"
    >
      <Icon d={light ? MOON : SUN} size={20} />
    </button>
  );
}
