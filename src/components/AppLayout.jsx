import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import Footer from "./Footer";
import { useLang } from "../lib/i18n";

function HomeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7a1 1 0 0 1 1-1h4l2 2h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function CardsIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="6" width="13" height="14" rx="2" />
      <path d="M8 3h9a2 2 0 0 1 2 2v12" />
    </svg>
  );
}

function BurgerIcon({ open }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="m5 5 14 14" />
          <path d="m19 5-14 14" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

const links = [
  { to: "/home", label: "nav.home", Icon: HomeIcon },
  { to: "/folders", label: "nav.folders", Icon: LibraryIcon },
  { to: "/flashcards", label: "nav.flashcards", Icon: CardsIcon },
];

const STORAGE_KEY = "mindpro:sidebar-open";

export default function AppLayout() {
  const { user } = useAuth();
  const { t } = useLang();

  // Desktop: keng yoki ingichka. Tanlov brauzerda saqlanadi.
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "closed";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, open ? "open" : "closed");
    } catch {
      /* xotira o'chirilgan bo'lishi mumkin */
    }
  }, [open]);

  const navLinks = (
    <ul className="space-y-1">
      {links.map(({ to, label, Icon }) => (
        <li key={to}>
          <NavLink
            to={to}
            title={open ? undefined : t(label)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl py-3 transition-colors ${open ? "px-4" : "justify-center px-0"} ${
                isActive
                  ? "bg-white/10 font-bold text-leaf"
                  : "text-white hover:bg-white/5"
              }`
            }
          >
            <Icon />
            {open && <span className="truncate">{t(label)}</span>}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  const initial = (user?.email?.[0] || "?").toUpperCase();

  // Profil: tugma emas, /profile sahifasiga havola
  const profileBlock = (
    <div className="mt-auto border-t border-white/10 pt-4">
      <NavLink
        to="/profile"
        title={open ? undefined : t("nav.profile")}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-2xl py-2.5 transition-colors ${open ? "px-2" : "justify-center px-0"} ${
            isActive ? "bg-white/10" : "hover:bg-white/5"
          }`
        }
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 font-bold"
          aria-hidden="true"
        >
          {initial}
        </span>
        {open && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">
              {t("nav.profile")}
            </span>
            <span
              className="block truncate text-xs text-mist"
              title={user?.email}
            >
              {user?.email}
            </span>
          </span>
        )}
      </NavLink>
    </div>
  );

  return (
    <div className="min-h-screen bg-night text-white md:flex md:gap-4 md:p-4 lg:gap-6 lg:p-6">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 flex-col gap-4 transition-[width] duration-200 md:sticky md:top-6 md:flex md:h-[calc(100vh-3rem)] ${
          open ? "w-60 lg:w-72" : "w-20"
        }`}
      >
        <div
          className={`glass flex items-center rounded-3xl py-4 ${open ? "justify-between px-5" : "justify-center px-0"}`}
        >
          {open && <Logo />}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? t("nav.collapse") : t("nav.expand")}
            className="rounded-xl p-2 text-white hover:bg-white/10"
          >
            <BurgerIcon open={false} />
          </button>
        </div>

        <nav
          className="glass flex flex-1 flex-col rounded-3xl p-4"
          aria-label={t("nav.main")}
        >
          {navLinks}
          {profileBlock}
        </nav>
      </aside>

      {/* Mobil yuqori panel */}
      <header className="glass sticky top-0 z-30 flex items-center rounded-b-2xl px-5 py-3.5 md:hidden">
        <Logo className="text-xl" />
      </header>

      {/* Mobil pastki dock: sidebar o'rnida */}
      <nav
        aria-label={t("nav.main")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-night/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {[...links, { to: "/profile", label: "nav.profile", Icon: null }].map(
            ({ to, label, Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                      isActive ? "text-leaf" : "text-mist hover:text-white"
                    }`
                  }
                >
                  {Icon ? (
                    <Icon />
                  ) : (
                    <span
                      className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white/15 text-[11px] font-bold text-white"
                      aria-hidden="true"
                    >
                      {initial}
                    </span>
                  )}
                  {t(label)}
                </NavLink>
              </li>
            ),
          )}
        </ul>
      </nav>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 md:pb-20 sm:px-6 md:px-2 md:pt-2">
        <Outlet />
        <Footer className="mt-16" />
      </main>
    </div>
  );
}
