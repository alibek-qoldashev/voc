import { useEffect, useState } from "react";
import { promptInstall, subscribeInstall } from "../lib/install";
import { useLang } from "../lib/i18n";
import { load, save } from "../lib/storage";
import { Btn, Icon } from "./ui";

const PHONE = ["M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z", "M11 18h2"];
const CLOSE = ["M18 6 6 18", "m6 6 12 12"];
const HIDE_KEY = "install-banner-hidden";

function useInstall() {
  const [state, setState] = useState("unavailable");
  useEffect(() => subscribeInstall(setState), []);
  return state;
}

// "VOC'ni telefonga o'rnatish" kartasi. banner — Home'dagi yopiladigan ko'rinishi
export default function InstallApp({ banner = false }) {
  const { t } = useLang();
  const state = useInstall();
  const [hidden, setHidden] = useState(() => banner && load(HIDE_KEY, false));
  const [iosHelp, setIosHelp] = useState(false);

  if (hidden || state === "unavailable" || (banner && state === "installed")) return null;

  const install = () => (state === "ios" ? setIosHelp(true) : promptInstall());
  const hide = () => {
    save(HIDE_KEY, true);
    setHidden(true);
  };

  return (
    <section
      className={`glass flex flex-wrap items-center gap-4 rounded-3xl p-5 ${banner ? "mb-6" : ""}`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-leaf/15 text-[#8fe36b]">
        <Icon d={PHONE} size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{t("install.title")}</p>
        <p className="text-sm text-mist">
          {state === "installed"
            ? t("install.done")
            : iosHelp
              ? t("install.iosHint")
              : t("install.text")}
        </p>
      </div>
      {state !== "installed" && !iosHelp && (
        <Btn className="h-[42px]" onClick={install}>
          {t("install.button")}
        </Btn>
      )}
      {banner && (
        <button
          type="button"
          onClick={hide}
          aria-label={t("common.close")}
          className="rounded-full p-2 text-mist hover:bg-white/10 hover:text-white"
        >
          <Icon d={CLOSE} size={18} />
        </button>
      )}
    </section>
  );
}
