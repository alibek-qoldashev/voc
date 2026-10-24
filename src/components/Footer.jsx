import { Link } from 'react-router-dom';
import Logo, { BRAND } from './Logo';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Advantages', href: '#advantages' },
      { label: 'Create an account', to: '/signup' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Spaced repetition', href: '#how-it-works' },
      { label: 'Building a deck', href: '#how-it-works' },
      { label: 'Study tips', href: '#how-it-works' },
    ],
  },
  {
    title: 'Contact',
    links: [
      { label: 'hello@mindpro.app', href: 'mailto:hello@mindpro.app' },
      { label: 'Report a problem', href: 'mailto:hello@mindpro.app?subject=Problem%20report' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-night">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo className="text-2xl" />
            <h2 className="mt-4 text-lg font-bold">About</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-mist">
              {BRAND} is a vocabulary app built for language learners. Collect the words you meet, then let the
              review schedule decide when to show each one again, so nothing you learn quietly fades away.
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-lg font-bold">{col.title}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link to={l.to} className="text-mist hover:text-leaf">{l.label}</Link>
                    ) : (
                      <a href={l.href} className="text-mist hover:text-leaf">{l.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-12 border-t border-white/10 pt-6 text-sm text-mist">
          © {new Date().getFullYear()} {BRAND}. Built in Tashkent.
        </p>
      </div>
    </footer>
  );
}