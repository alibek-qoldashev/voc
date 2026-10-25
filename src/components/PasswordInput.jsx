import { useState } from 'react';
import { EyeIcon } from './ui';
import { useLang } from '../lib/i18n';

// Parol maydoni: o'ngdagi ko'z belgisi matnni ko'rsatadi yoki yashiradi
export default function PasswordInput({ id, value, onChange, autoComplete, minLength, placeholder }) {
  const [shown, setShown] = useState(false);
  const { t } = useLang();
  return (
    <div className="relative">
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full rounded-full bg-[#e0e0e0] py-3.5 pl-5 pr-14 text-sm text-night placeholder:text-night/50 focus:outline-offset-2"
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? t('auth.hidePassword') : t('auth.showPassword')}
        aria-pressed={shown}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-full text-night/60 hover:text-night"
      >
        <EyeIcon open={shown} />
      </button>
    </div>
  );
}