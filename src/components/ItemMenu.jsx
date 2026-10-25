import { useEffect, useRef, useState } from 'react';
import { useLang } from '../lib/i18n';

function DotsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

// Papka va decklarning o'ng yuqorisidagi uch nuqtali menyu
export default function ItemMenu({
  items,
  label,
  buttonClassName = 'rounded-xl p-2 text-mist transition-colors hover:bg-white/10 hover:text-white',
}) {
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label ?? t('common.moreOptions')}
        className={buttonClassName}
      >
        <DotsIcon />
      </button>

      {open && (
        <div role="menu" className="glass absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-2xl p-1.5">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); item.onClick(); }}
              className={`block w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold hover:bg-white/10 ${
                item.danger ? 'text-rose' : 'text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}