import { useEffect, useState } from "react";
import { getFolders, setDeckFolder } from "../lib/api";
import { useLang } from "../lib/i18n";
import { Btn, ErrorBox, Icon, Modal, Spinner } from "./ui";

// "Add to folder": deck turgan papka belgilangan bo'ladi. Boshqasini belgilasa
// deck o'sha papkaga ko'chadi, belgini olib tashlasa papkadan chiqadi.
// Deck bir vaqtda faqat bitta papkada turadi.
export default function FolderPicker({ deck, onChange, onClose }) {
  const { t } = useLang();
  const [folders, setFolders] = useState(null);
  const [current, setCurrent] = useState(deck.folder_id ?? null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getFolders()
      .then(setFolders)
      .catch((e) => setError(e.message));
  }, []);

  const toggle = async (folderId) => {
    const next = current === folderId ? null : folderId;
    setBusy(folderId);
    setError("");
    try {
      await setDeckFolder(deck.id, next);
      setCurrent(next);
      onChange(next);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <Modal title={t("folder.addTo")} onClose={onClose}>
      <p className="-mt-3 mb-5 text-sm text-mist">
        {t("folder.pickHint", { name: deck.name })}
      </p>
      <ErrorBox>{error}</ErrorBox>
      {!folders && !error && <Spinner />}
      {folders && folders.length === 0 && (
        <p className="text-mist">{t("folders.empty")}</p>
      )}
      {folders && folders.length > 0 && (
        <ul className="space-y-2">
          {folders.map((f) => {
            const checked = current === f.id;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  disabled={!!busy}
                  onClick={() => toggle(f.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors disabled:opacity-60 ${
                    checked
                      ? "border-leaf bg-leaf/10"
                      : "border-white/10 hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                      checked ? "border-leaf bg-leaf text-night" : "border-white/40"
                    }`}
                  >
                    {checked && <Icon d={["M20 6 9 17l-5-5"]} size={16} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{f.name}</span>
                    <span className="block text-xs text-mist">
                      {t("count.decks", { count: f.deckCount })}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-6">
        <Btn variant="glass" onClick={onClose}>
          {t("common.done")}
        </Btn>
      </div>
    </Modal>
  );
}
