import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo, { BRAND } from "./Logo";

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
  { to: "/home", label: "Home", Icon: HomeIcon },
  { to: "/library", label: "Library", Icon: LibraryIcon },
  { to: "/flashcards", label: "Flashcards", Icon: CardsIcon },
];

const STORAGE_KEY = "mindpro:sidebar-open";

export default function AppLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // Desktop: keng yoki ingichka. Tanlov brauzerda saqlanadi.
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "closed";
    } catch {
      return true;
    }
  });
  // Mobil: sidebar ekran ustiga chiqadi
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, open ? "open" : "closed");
    } catch {
      /* xotira o'chirilgan bo'lishi mumkin */
    }
  }, [open]);

  // Sahifa almashsa, mobil menyu yopiladi
  useEffect(() => setDrawer(false), [pathname]);

  // Mobil menyu ochiqda: Esc yopadi va orqa fon siljimaydi
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const navLinks = (
    <ul className="space-y-1">
      {links.map(({ to, label, Icon }) => (
        <li key={to}>
          <NavLink
            to={to}
            title={open ? undefined : label}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl py-3 transition-colors ${open ? "px-4" : "justify-center px-0"} ${
                isActive
                  ? "bg-white/10 font-bold text-leaf"
                  : "text-white hover:bg-white/5"
              }`
            }
          >
            <Icon />
            {open && <span className="truncate">{label}</span>}
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
        title={open ? undefined : "Profile"}
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
            <span className="block truncate text-sm font-bold">Profile</span>
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
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
            className="rounded-xl p-2 text-white hover:bg-white/10"
          >
            <BurgerIcon open={false} />
          </button>
        </div>

        <nav
          className="glass flex flex-1 flex-col rounded-3xl p-4"
          aria-label="Main"
        >
          {navLinks}
          {profileBlock}
        </nav>
      </aside>

      {/* Mobil yuqori panel */}
      <header className="glass sticky top-0 z-30 flex items-center gap-3 rounded-2xl px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Open menu"
          aria-expanded={drawer}
          className="rounded-xl p-2 text-white hover:bg-white/10"
        >
          <BurgerIcon open={false} />
        </button>
        <Logo className="text-xl" />
      </header>

      {/* Mobil menyu */}
      {drawer && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawer(false)}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${BRAND} menu`}
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-4 bg-night p-4 md:hidden"
          >
            <div className="glass flex items-center justify-between rounded-3xl px-5 py-4">
              <Logo />
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
                className="rounded-xl p-2 text-white hover:bg-white/10"
              >
                <BurgerIcon open />
              </button>
            </div>
            <nav
              className="glass flex flex-1 flex-col rounded-3xl p-4"
              aria-label="Main"
            >
              <ul className="space-y-1">
                {links.map(({ to, label, Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-2xl px-4 py-3 ${
                          isActive
                            ? "bg-white/10 font-bold text-leaf"
                            : "text-white hover:bg-white/5"
                        }`
                      }
                    >
                      <Icon />
                      <span>{label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
              <div className="mt-auto border-t border-white/10 pt-4">
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-2 py-2.5 ${isActive ? "bg-white/10" : "hover:bg-white/5"}`
                  }
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 font-bold"
                    aria-hidden="true"
                  >
                    {initial}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      Profile
                    </span>
                    <span className="block truncate text-xs text-mist">
                      {user?.email}
                    </span>
                  </span>
                </NavLink>
              </div>
            </nav>
          </div>
        </>
      )}

      <main className="min-w-0 flex-1 px-4 pb-20 pt-6 sm:px-6 md:px-2 md:pt-2">
        <Outlet />
      </main>
    </div>
  );
}
