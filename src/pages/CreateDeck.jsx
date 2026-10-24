import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { addCards, createDeck } from '../lib/api';
import { parseImport } from '../lib/utils';
import { Btn, ErrorBox, Field, Spinner, fieldCls } from '../components/ui';

const emptyRow = () => ({ key: Math.random().toString(36).slice(2), term: '', definition: '' });

export default function CreateDeck() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const folderId = params.get('folder');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const [importOpen, setImportOpen] = useState(false);
  const [bulk, setBulk] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setRow = (key, field) => (e) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: e.target.value } : r)));

  const addRow = () => setRows((rs) => [...rs, emptyRow()]);
  const removeRow = (key) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));

  const applyImport = () => {
    const parsed = parseImport(bulk);
    if (!parsed.length) return setError('Each line needs at least "term ; definition".');
    setRows((rs) => [
      ...rs.filter((r) => r.term.trim() || r.definition.trim()),
      ...parsed.map((p) => ({ ...emptyRow(), term: p.term, definition: p.definition || p.translation })),
    ]);
    setBulk('');
    setImportOpen(false);
    setError('');
  };

  const filled = rows.filter((r) => r.term.trim() && r.definition.trim());

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    if (!filled.length) return setError('Add at least one card with a term and a definition.');
    setBusy(true);
    setError('');
    try {
      const deck = await createDeck(name, description, folderId);
      await addCards(deck.id, filled.map((r) => ({ term: r.term, definition: r.definition })));
      navigate(`/flashcards/deck/${deck.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (busy) return <Spinner label="Creating your deck" />;

  return (
    <div className="max-w-3xl">
      <Link to={folderId ? `/library/${folderId}` : '/flashcards'} className="text-sm text-mist hover:text-leaf">← Back</Link>
      <h1 className="mt-2 text-3xl font-extrabold">Create a deck</h1>

      <form onSubmit={save} className="mt-8 space-y-8">
        <section className="glass space-y-4 rounded-3xl p-6">
          <Field label="Deck name">
            <input autoFocus className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Unit 7" />
          </Field>
          <Field label="Description (optional)">
            <input className={fieldCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Words from the reading section" />
          </Field>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">Terms</h2>
            <button type="button" onClick={() => setImportOpen((v) => !v)} className="text-sm font-semibold text-leaf underline">
              {importOpen ? 'Close import' : 'Import'}
            </button>
          </div>

          {importOpen && (
            <div className="glass mb-5 rounded-3xl p-5">
              <p className="text-sm text-mist">
                One card per line: <code className="rounded bg-white/10 px-1">term ; definition</code>.
                Tab or " - " work too, so you can paste from a list you already keep.
              </p>
              <textarea
                autoFocus
                className={`${fieldCls} mt-3 h-44 font-mono`}
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                placeholder={'mitigate ; to make something less severe\nplausible ; seeming reasonable or likely'}
                aria-label="Import terms"
              />
              <div className="mt-3">
                <Btn onClick={applyImport} disabled={!bulk.trim()}>Add these terms</Btn>
              </div>
            </div>
          )}

          <ul className="space-y-3">
            {rows.map((r, i) => (
              <li key={r.key} className="glass rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-3 w-6 shrink-0 text-sm text-mist">{i + 1}</span>
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                    <input
                      className={fieldCls}
                      value={r.term}
                      onChange={setRow(r.key, 'term')}
                      placeholder="Term"
                      aria-label={`Term ${i + 1}`}
                    />
                    <input
                      className={fieldCls}
                      value={r.definition}
                      onChange={setRow(r.key, 'definition')}
                      placeholder="Definition"
                      aria-label={`Definition ${i + 1}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(r.key)}
                    aria-label={`Remove row ${i + 1}`}
                    disabled={rows.length === 1}
                    className="mt-2 rounded-xl px-3 py-1.5 text-mist hover:bg-white/10 hover:text-rose disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={addRow}
            className="mt-4 w-full rounded-2xl border border-dashed border-white/20 py-3 text-sm font-semibold text-mist hover:border-leaf hover:text-leaf"
          >
            + Add another card
          </button>
        </section>

        <ErrorBox>{error}</ErrorBox>

        <div className="flex flex-wrap items-center gap-4">
          <Btn type="submit" disabled={!name.trim()} className="px-10 py-3.5">Create deck</Btn>
          <p className="text-sm text-mist">{filled.length} card{filled.length === 1 ? '' : 's'} ready</p>
        </div>
      </form>
    </div>
  );
}