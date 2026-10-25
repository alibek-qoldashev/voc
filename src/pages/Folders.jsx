import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteFolder, getFolders, renameFolder, setFolderPinned } from '../lib/api';
import CreateMenu from '../components/CreateMenu';
import ItemMenu from '../components/ItemMenu';
import { Badge, ErrorBox, PageTitle, Spinner, fieldCls } from '../components/ui';
import { useLang } from '../lib/i18n';

function FolderIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7a1 1 0 0 1 1-1h4l2 2h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 2 9 7H5l5 5-6 8 8-6 5 5V15l5-5h-4z" />
    </svg>
  );
}

export default function Folders() {
  const [folders, setFolders] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const { t } = useLang();

  const load = () => getFolders().then(setFolders).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const q = query.trim().toLowerCase();
  const shown = folders?.filter(
    (f) => !q || f.name.toLowerCase().includes(q) || (f.description || '').toLowerCase().includes(q)
  );

  const pin = async (folder) => {
    try {
      await setFolderPinned(folder.id, !folder.pinned);
      load();
    } catch (e) { setError(e.message); }
  };

  const rename = async (folder) => {
    const name = window.prompt(t('folders.renamePrompt'), folder.name);
    if (!name?.trim()) return;
    try {
      await renameFolder(folder.id, name);
      setFolders((fs) => fs.map((f) => (f.id === folder.id ? { ...f, name: name.trim() } : f)));
    } catch (e) { setError(e.message); }
  };

  const remove = async (folder) => {
    if (!window.confirm(t('folders.deleteConfirm', { name: folder.name }))) return;
    try {
      await deleteFolder(folder.id);
      setFolders((fs) => fs.filter((f) => f.id !== folder.id));
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <PageTitle right={<CreateMenu onFolderCreated={load} />}>{t('nav.folders')}</PageTitle>

      <ErrorBox>{error}</ErrorBox>
      {!folders && !error && <Spinner />}

      {folders && folders.length > 0 && (
        <input
          className={`${fieldCls} mb-6 max-w-sm`}
          placeholder={t('folders.search')}
          aria-label={t('folders.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {folders && folders.length === 0 && (
        <div className="glass rounded-3xl p-10 text-center">
          <p className="text-xl font-bold">{t('folders.empty')}</p>
          <p className="mt-1 text-mist">{t('folders.emptyHint')}</p>
        </div>
      )}

      {shown && shown.length > 0 && (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((f) => (
            <li key={f.id} className="glass relative flex h-full flex-col rounded-3xl p-5">
              <div className="absolute right-3 top-3">
                <ItemMenu
                  label={t('common.optionsFor', { name: f.name })}
                  items={[
                    { label: f.pinned ? t('common.unpin') : t('common.pin'), onClick: () => pin(f) },
                    { label: t('common.rename'), onClick: () => rename(f) },
                    { label: t('common.delete'), onClick: () => remove(f), danger: true },
                  ]}
                />
              </div>

              <Link to={`/folders/${f.id}`} className="flex flex-1 flex-col gap-3 pr-10">
                <span className="text-leaf"><FolderIcon /></span>
                <span className="text-xl font-bold leading-snug">{f.name}</span>
                {f.description && <span className="line-clamp-2 text-sm text-mist">{f.description}</span>}
                <span className="mt-auto flex items-center gap-2 pt-2">
                  <Badge>{t('count.decks', { count: f.deckCount })}</Badge>
                  {f.pinned && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-leaf">
                      <PinIcon /> {t('common.pinned')}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {folders && folders.length > 0 && shown.length === 0 && (
        <p className="text-mist">{t('common.noMatch', { query })}</p>
      )}
    </div>
  );
}