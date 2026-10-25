import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useLang } from "../lib/i18n";
import Logo from "../components/Logo";
import { Spinner, btnClass } from "../components/ui";

// Google'dan qaytish: sessiya tayyor bo'lgach /home ga, xato bo'lsa sababini ko'rsatamiz
export default function AuthCallback() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [error, setError] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.slice(1));
    return p.get("error_description") || h.get("error_description") || "";
  });

  useEffect(() => {
    if (error) return;
    let done = false;
    const finish = (session) => {
      if (done || !session) return;
      done = true;
      navigate("/home", { replace: true });
    };
    const { data } = supabase.auth.onAuthStateChange((_e, s) => finish(s));
    // detectSessionInUrl kodni almashtirib bo'lgach getSession sessiyani qaytaradi
    supabase.auth.getSession().then(({ data: d, error: e }) => {
      if (e) setError(e.message);
      else if (d.session) finish(d.session);
    });
    const timer = setTimeout(() => !done && setError("timeout"), 15000);
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [error, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-night px-6 text-white">
      <Logo className="text-3xl" />
      {error ? (
        <div className="glass max-w-md rounded-3xl p-8 text-center">
          <p className="text-xl font-bold">{t("auth.googleFailed")}</p>
          <p className="mt-2 text-sm text-mist">
            {error === "timeout" ? t("auth.googleTimeout") : error}
          </p>
          <Link to="/login" className={btnClass("primary", "mt-6")}>
            {t("auth.backToLogin")}
          </Link>
        </div>
      ) : (
        <Spinner label={t("auth.signingIn")} />
      )}
    </div>
  );
}
