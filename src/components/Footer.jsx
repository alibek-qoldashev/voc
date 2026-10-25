import { Link } from 'react-router-dom';
import { LANGUAGES, useLang } from '../lib/i18n';
import Logo from './Logo';
import { Select } from './ui';

const links = [
  { to: '/about', key: 'footer.about' },
  { to: '/help', key: 'footer.help' },
  { to: '/contact', key: 'footer.contact' },
  { to: '/privacy', key: 'footer.privacy' },
];

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
    </svg>
  );
}

// Ixcham footer: havolalar, til tanlovi va mualliflik
export default function Footer({ className = '' }) {
  const { lang, setLang, t } = useLang();

  return (
    <footer className={`border-t border-white/10 ${className}`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-6 md:flex-row md:items-center md:justify-between">
        <nav aria-label={t('footer.nav')}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-mist hover:text-leaf">
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label className="flex items-center gap-2 text-mist">
            <GlobeIcon />
            <span className="sr-only">{t('footer.language')}</span>
            <Select value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </label>
          <p className="flex items-center gap-2 text-mist">
            <Logo className="text-sm" />
            <span>Copyright © 2026 Alibek Qoldashev</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
