import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createFolder } from "../lib/api";
import { Btn, ErrorBox, Field, fieldCls } from "./ui";
import { useLang } from "../lib/i18n";

function PlusIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

// Har bir sahifaning o'ng yuqorisidagi "+" tugmasi
export default function CreateMenu({ onFolderCreated }) {
  const navigate = useNavigate();
  const { t } = useLang();
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const wrapRef = useRef(null);
  const nameRef = useRef(null);

  // Tashqariga bosilsa yoki Esc bosilsa menyu yopiladi
  useEffect(() => {
    if (!menu) return;
    const onClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) setMenu(false);
    };
    const onKey = (e) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  useEffect(() => {
    if (!modal) return;
    nameRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && closeModal();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  const closeModal = () => {
    setModal(false);
    setName("");
    setDescription("");
    setError("");
  };

  const submitFolder = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const folder = await createFolder(name, description);
      closeModal();
      if (onFolderCreated) onFolderCreated(folder);
      else navigate(`/folders/${folder.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-haspopup="menu"
          aria-expanded={menu}
          aria-label={t("common.create")}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf text-night transition-colors hover:bg-[#63c941]"
        >
          <PlusIcon />
        </button>

        {menu && (
          <div
            role="menu"
            className="glass absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-2xl p-1.5"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false);
                navigate("/create-deck");
              }}
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold hover:bg-white/10"
            >
              {t("create.deck")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false);
                setModal(true);
              }}
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold hover:bg-white/10"
            >
              {t("create.folder")}
            </button>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={closeModal}
            className="absolute inset-0 cursor-default"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="folder-title"
            className="glass relative w-full max-w-lg rounded-3xl p-6 sm:p-8"
          >
            <h2 id="folder-title" className="text-2xl font-extrabold">
              {t("create.newFolder")}
            </h2>
            <p className="mt-1 text-sm text-mist">
              {t("create.folderHint")}
            </p>

            <form onSubmit={submitFolder} className="mt-6 space-y-4">
              <Field label={t("create.folderName")}>
                <input
                  ref={nameRef}
                  className={fieldCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("create.folderNamePh")}
                />
              </Field>
              <Field label={t("common.descriptionOptional")}>
                <input
                  className={fieldCls}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("create.folderDescPh")}
                />
              </Field>

              <ErrorBox>{error}</ErrorBox>

              <div className="flex flex-wrap gap-3 pt-2">
                <Btn type="submit" disabled={!name.trim() || busy}>
                  {busy ? t("common.creating") : t("common.create")}
                </Btn>
                <Btn variant="glass" onClick={closeModal}>
                  {t("common.cancel")}
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
