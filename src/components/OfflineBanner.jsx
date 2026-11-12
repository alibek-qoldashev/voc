import { useEffect, useState } from "react";
import { subscribeOffline } from "../lib/offline";
import { useLang } from "../lib/i18n";

// Tepada: internet yo'qligi va yuborilishi kutilayotgan javoblar soni
export default function OfflineBanner() {
  const { t } = useLang();
  const [online, setOnline] = useState(navigator.onLine);
  const [sync, setSync] = useState({ pending: 0, syncing: false });

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const unsub = subscribeOffline(setSync);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      unsub();
    };
  }, []);

  if (online && !sync.pending) return null;

  return (
    <p
      role="status"
      className={`mb-4 rounded-2xl border px-4 py-2.5 text-sm font-semibold ${
        online
          ? "border-sky/40 bg-sky/10 text-sky"
          : "border-amber/40 bg-amber/10 text-amber"
      }`}
    >
      {online ? t("offline.syncing") : t("offline.banner")}
      {sync.pending > 0 && ` · ${t("offline.pending", { n: sync.pending })}`}
    </p>
  );
}
