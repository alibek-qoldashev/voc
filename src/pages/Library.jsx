import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFolders } from '../lib/api';
import CreateMenu from '../components/CreateMenu';
import { Badge, ErrorBox, PageTitle, Spinner, fieldCls } from '../components/ui';

function FolderIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7a1 1 0 0 1 1-1h4l2 2h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

export default function Library() {
  const [folders, setFolders] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = () => getFolders().then(setFolders).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const q = query.trim().toLowerCase();
  const shown = folders?.filter((f) => !q || f.name.toLowerCase().includes(q) || (f.description || '').toLowerCase().includes(q));

  return (
    <div>
      <PageTitle right={<CreateMenu onFolderCreated={load} />}>Library</PageTitle>

      <ErrorBox>{error}</ErrorBox>
      {!folders && !error && <Spinner />}

      {folders && folders.length > 0 && (
        <input
          className={`${fieldCls} mb-6 max-w-sm`}
          placeholder="Search your folders"
          aria-label="Search folders"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {folders && folders.length === 0 && (
        <div className="glass rounded-3xl p-10 text-center">
          <p className="text-xl font-bold">No folders yet</p>
          <p className="mt-1 text-mist">Use the plus button to create your first folder.</p>
        </div>
      )}

      {shown && shown.length > 0 && (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((f) => (
            <li key={f.id}>
              <Link to={`/library/${f.id}`} className="glass flex h-full flex-col gap-3 rounded-3xl p-5 transition-colors hover:border-white/30">
                <span className="text-leaf"><FolderIcon /></span>
                <span className="text-xl font-bold leading-snug">{f.name}</span>
                {f.description && <span className="line-clamp-2 text-sm text-mist">{f.description}</span>}
                <span className="mt-auto pt-2">
                  <Badge>{f.deckCount} deck{f.deckCount === 1 ? '' : 's'}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {folders && folders.length > 0 && shown.length === 0 && (
        <p className="text-mist">Nothing matches "{query}".</p>
      )}
    </div>
  );
}