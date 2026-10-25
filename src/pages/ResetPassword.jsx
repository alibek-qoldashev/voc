import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useLang } from "../lib/i18n";
import Logo from "../components/Logo";
import PasswordInput from "../components/PasswordInput";
import { Btn, Spinner, btnClass } from "../components/ui";

// Emaildagi "parolni tiklash" havolasi shu yerga olib keladi
export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [ready, setReady] = useState(null); // null = tekshirilmoqda, false = havola yaroqsiz
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let settled = false;
    const ok = () => {
      settled = true;
      setReady(true);
    };
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (s && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) ok();
    });
    supabase.auth.getSession().then(({ data: d }) => d.session && ok());
    const timer = setTimeout(() => !settled && setReady(false), 8000);
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError(t("auth.shortPassword"));
    if (password !== confirm) return setError(t("auth.passwordsDiffer"));
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError(updateError.message);
    navigate("/home", { replace: true });
  };

  return (
    <div className="min-h-screen bg-night px-6 py-8 text-white">
      <Link to="/" aria-label={t("auth.backWelcome")}>
        <Logo className="text-3xl" />
      </Link>
      <div className="mx-auto mt-10 max-w-lg">
        <h1 className="text-center text-3xl font-extrabold">
          {t("auth.newPasswordTitle")}
        </h1>

        {ready === null && <Spinner />}

        {ready === false && (
          <div className="glass mt-8 rounded-[2.5rem] p-8 text-center">
            <p className="text-lg font-bold">{t("auth.linkExpired")}</p>
            <Link to="/login" className={btnClass("primary", "mt-6")}>
              {t("auth.backToLogin")}
            </Link>
          </div>
        )}

        {ready && (
          <form
            onSubmit={submit}
            className="glass mt-8 space-y-5 rounded-[2.5rem] p-7 sm:p-10"
          >
            <div>
              <label htmlFor="new-password" className="mb-1.5 block px-1 text-xs">
                {t("auth.newPassword")}
              </label>
              <PasswordInput
                id="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                placeholder={t("auth.passwordPhNew")}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block px-1 text-xs">
                {t("auth.confirmPassword")}
              </label>
              <PasswordInput
                id="confirm-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                placeholder={t("auth.confirmPasswordPh")}
              />
            </div>
            {error && (
              <p role="alert" className="rounded-xl bg-rose/15 px-4 py-3 text-sm text-rose">
                {error}
              </p>
            )}
            <div className="flex justify-center pt-2">
              <Btn type="submit" disabled={busy} className="px-12 py-3.5 text-base">
                {busy ? t("auth.wait") : t("auth.savePassword")}
              </Btn>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
