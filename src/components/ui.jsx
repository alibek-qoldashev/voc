import { useLang } from '../lib/i18n';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40';

const variants = {
  primary: 'bg-leaf text-night hover:bg-[#63c941]',
  glass: 'border border-white/15 bg-white/5 text-white hover:bg-white/10',
  danger: 'border border-rose/40 text-rose hover:bg-rose/10',
};

export function Btn({ variant = 'primary', className = '', ...props }) {
  return <button type="button" className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

// Link tugmalar uchun bir xil ko'rinish
export const btnClass = (variant = 'primary', className = '') => `${base} ${variants[variant]} ${className}`;

export const fieldCls =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-mist/70 focus:border-leaf';

// Login / Sign up shaklidagi och kulrang "pill" maydonlar (Figma)
export const authInput =
  'w-full rounded-full bg-[#e0e0e0] px-5 py-3.5 text-sm text-night placeholder:text-night/50 focus:outline-offset-2';

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-white">{label}</span>
      {children}
    </label>
  );
}

export function Badge({ children, tone = 'plain' }) {
  const tones = {
    plain: 'bg-white/10 text-mist',
    leaf: 'bg-leaf/20 text-[#8fe36b]',
    rose: 'bg-rose/15 text-rose',
    amber: 'bg-amber/15 text-amber',
    sky: 'bg-sky/15 text-sky',
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Spinner({ label }) {
  const { t } = useLang();
  return (
    <div className="flex items-center gap-3 py-10 text-mist" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-leaf" />
      {label ?? t('common.loading')}
    </div>
  );
}

export function ErrorBox({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-rose">
      {children}
    </p>
  );
}

export function PageTitle({ children, right }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-extrabold">{children}</h1>
      {right}
    </div>
  );
}

export function EyeIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="m3 3 18 18" />}
    </svg>
  );
}

export function SpeakIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}
export function Icon({ d, size = 22, fill = "none" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d.map((p) => (
        <path key={p} d={p} />
      ))}
    </svg>
  );
}


export function Modal({ title, onClose, children }) {
  const { t } = useLang();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-[#141831] p-6 sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="text-3xl font-extrabold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/15"
          >
            <Icon d={["M18 6 6 18", "m6 6 12 12"]} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-leaf" : "bg-white/20"}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-6" : "left-1"}`}
      />
    </button>
  );
}

// Ixcham select: brauzer strelkasi o'rniga matn yonida turadigan o'z strelkamiz
export function Select({ className = '', children, ...props }) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <select
        {...props}
        className="cursor-pointer appearance-none rounded-full border border-white/15 bg-white/5 py-2 pl-4 pr-9 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus:border-leaf [&>option]:bg-night"
      >
        {children}
      </select>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  );
}

// Karta yuzidagi rasm (so'z yoki ta'rif tomonida)
export function CardImage({ src, className = 'mb-4 max-h-36 sm:max-h-44' }) {
  if (!src) return null;
  return <img src={src} alt="" loading="lazy" className={`max-w-full rounded-2xl object-contain ${className}`} />;
}
