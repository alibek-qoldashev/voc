import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDeck } from "../lib/api";
import { Btn, ErrorBox, Field, fieldCls } from "./ui";

// Home, Library va Flashcards sahifalarining o'ng yuqori burchagidagi tugma
export default function CreateDeckButton({ onCreated }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    nameRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    setName("");
    setDescription("");
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const deck = await createDeck(name, description);
      close();
      if (onCreated) onCreated(deck);
      else navigate(`/library/${deck.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Btn onClick={() => setOpen(true)}>Create deck</Btn>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 cursor-default"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-deck-title"
            className="glass relative w-full max-w-lg rounded-3xl p-6 sm:p-8"
          >
            <h2 id="create-deck-title" className="text-2xl font-extrabold">
              New deck
            </h2>
            <p className="mt-1 text-sm text-mist">
              Give it a name now; you can add terms right after.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field label="Deck name">
                <input
                  ref={nameRef}
                  className={fieldCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="IELTS Writing words"
                />
              </Field>
              <Field label="Description (optional)">
                <input
                  className={fieldCls}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Academic vocabulary for Task 2"
                />
              </Field>

              <ErrorBox>{error}</ErrorBox>

              <div className="flex flex-wrap gap-3 pt-2">
                <Btn type="submit" disabled={!name.trim() || busy}>
                  {busy ? "Creating…" : "Create deck"}
                </Btn>
                <Btn variant="glass" onClick={close}>
                  Cancel
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
