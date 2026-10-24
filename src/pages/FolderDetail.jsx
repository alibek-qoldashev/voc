import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteFolder, getDecksWithStats, getFolder, renameFolder, setDeckFolder } from '../lib/api';
import DeckTile from '../components/DeckTile';
import { Badge, Btn, ErrorBox, Spinner, btnClass } from '../components/ui';

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export default function FolderDetail() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const [folder, setFolder] = useState(null);
  const [decks, setDecks] = useState(null);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState('');

  const load = () =>
    Promise.all([getFolder(folderId), getDecksWithStats()])
      .then(([f, all]) => { setFolder(f); setDecks(all); })
      .catch((e) => setError(e.message));

  useEffect(() => { load(); }, [folderId]);

  if (error && !folder) return <ErrorBox>{error}</ErrorBox>;
  if (!folder || !decks) return <Spinner />;

  const inside = decks.filter((d) => d.folder_id === folderId);
  const outside = decks.filter((d) => d.folder_id !== folderId);

  const add = async (deckId) => {
    setBusy(deckId);
    try {
      await setDeckFolder(deckId, folderId);
      setDecks((ds) => ds.map((d) => (d.id === deckId ? { ...d, folder_id: folderId } : d)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const remove = async (deckId) => {
    setBusy(deckId);
    try {
      await setDeckFolder(deckId, null);
      setDecks((ds) => ds.map((d) => (d.id === deckId ? { ...d, folder_id: null } : d)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const rename = async () => {
    const n = window.prompt('New folder name:', folder.name);
    if (!n?.trim()) return;
    try { await renameFolder(folderId, n); setFolder({ ...folder, name: n.trim() }); } catch (e) { setError(e.message); }
  };

  const removeFolder = async () => {
    if (!window.confirm(`Delete the folder "${folder.name}"? The decks inside stay in Flashcards.`)) return;
    try { await deleteFolder(folderId); navigate('/library'); } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <Link to="/library" className="text-sm text-mist hover:text-leaf">← Library</Link>

      <div className="mb-8 mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{folder.name}</h1>
          {folder.description && <p className="mt-1 text-mist">{folder.description}</p>}
          <div className="mt-2"><Badge>{inside.length} deck{inside.length === 1 ? '' : 's'}</Badge></div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Btn variant="glass" onClick={rename}>Rename</Btn>
          <Btn variant="danger" onClick={removeFolder}>Delete folder</Btn>
        </div>
      </div>

      <ErrorBox>{error}</ErrorBox>

      {inside.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center">
          <p className="text-xl font-bold">Your folder is empty</p>
          <p className="mt-1 text-mist">Add a deck you already made, or create a new one.</p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setPicking((p) => !p)}
              aria-expanded={picking}
              aria-label="Add a deck"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf text-night hover:bg-[#63c941]"
            >
              <PlusIcon />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {inside.map((d) => (
              <div key={d.id} className="space-y-2">
                <DeckTile deck={d} />
                <button
                  type="button"
                  onClick={() => remove(d.id)}
                  disabled={busy === d.id}
                  className="text-xs text-mist underline hover:text-rose"
                >
                  Remove from folder
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPicking((p) => !p)}
              aria-expanded={picking}
              aria-label="Add a deck"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf text-night hover:bg-[#63c941]"
            >
              <PlusIcon />
            </button>
            <span className="text-sm text-mist">Add another deck</span>
          </div>
        </>
      )}

      {picking && (
        <section className="glass mt-6 rounded-3xl p-6">
          <h2 className="text-lg font-bold">Add a deck to this folder</h2>

          {outside.length === 0 ? (
            <div className="mt-4">
              <p className="text-mist">You have no any decks yet.</p>
              <Link to={`/create-deck?folder=${folderId}`} className={btnClass('primary', 'mt-4')}>Create a deck</Link>
            </div>
          ) : (
            <>
              <ul className="mt-4 space-y-3">
                {outside.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{d.name}</p>
                      <p className="text-sm text-mist">
                        {d.total} terms{d.folder_id ? ' · already in another folder' : ''}
                      </p>
                    </div>
                    <Btn className="!px-5 !py-2" onClick={() => add(d.id)} disabled={busy === d.id}>
                      {busy === d.id ? 'Adding…' : 'Add'}
                    </Btn>
                  </li>
                ))}
              </ul>
              <Link to={`/create-deck?folder=${folderId}`} className={btnClass('glass', 'mt-5')}>Create a new deck instead</Link>
            </>
          )}
        </section>
      )}
    </div>
  );
}