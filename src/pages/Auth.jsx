import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { providerEnabled, supabase } from "../lib/supabase";
import Logo from "../components/Logo";
import PasswordInput from "../components/PasswordInput";
import { Btn, authInput } from "../components/ui";
import { useLang } from "../lib/i18n";

const RESEND_SECONDS = 60;
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
const cleanUsername = (v) =>
  v.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20);

const tabCls = (active) =>
  `rounded-full px-7 py-2.5 text-2xl font-extrabold sm:px-9 sm:py-3 sm:text-3xl ${
    active ? "glass text-leaf" : "text-white hover:text-leaf"
  }`;

const labelCls = "mb-1.5 block px-1 text-xs";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function Alert({ tone, children }) {
  if (!children) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm ${
        tone === "error" ? "bg-rose/15 text-rose" : "bg-leaf/15 text-[#a6ee86]"
      }`}
    >
      {children}
    </p>
  );
}

export default function Auth({ mode }) {
  const isLogin = mode === "login";
  const navigate = useNavigate();
  const { state } = useLocation();
  const { t } = useLang();

  const [identifier, setIdentifier] = useState(state?.email || ""); // login: username yoki email
  const [email, setEmail] = useState(state?.email || "");
  const [username, setUsername] = useState("");
  const [usernameState, setUsernameState] = useState("idle"); // idle | checking | free | taken
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(state?.notice || "");
  const [busy, setBusy] = useState(false);

  // form | code (email tasdiqlash kodi) | forgot (parolni tiklash)
  const [stage, setStage] = useState("form");
  const [codeEmail, setCodeEmail] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resetEmail, setResetEmail] = useState("");
  const codeRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (stage === "code") codeRef.current?.focus();
  }, [stage]);

  // Google sahifasidan "orqaga" bilan qaytilganda brauzer sahifani eski holatida
  // (tugma "Please wait…") tiklaydi — qayta faollashtiramiz
  useEffect(() => {
    const onShow = (e) => e.persisted && setBusy(false);
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  // Sign up: username bandligini yozib bo'lgach tekshiramiz
  useEffect(() => {
    if (isLogin || !USERNAME_RE.test(username)) return setUsernameState("idle");
    setUsernameState("checking");
    const timer = setTimeout(async () => {
      const { data, error: rpcError } = await supabase.rpc("username_available", {
        p_username: username,
      });
      setUsernameState(rpcError ? "idle" : data ? "free" : "taken");
    }, 400);
    return () => clearTimeout(timer);
  }, [username, isLogin]);

  const askForCode = (address, message) => {
    setCodeEmail(address);
    setStage("code");
    setCooldown(RESEND_SECONDS);
    setInfo(message);
  };

  const loginWithEmail = async (address) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: address,
      password,
    });
    if (!signInError) return navigate("/home", { replace: true });

    if (signInError.code === "email_not_confirmed") {
      // Akkaunt bor, lekin email hali tasdiqlanmagan: kod yuboramiz
      await supabase.auth.resend({ type: "signup", email: address });
      return askForCode(address, t("auth.codeSentVerify", { email: address }));
    }
    const { data: exists } = await supabase.rpc("email_exists", { p_email: address });
    if (exists === false) {
      return navigate("/signup", {
        state: { email: address, notice: t("auth.notRegistered") },
      });
    }
    setError(t("auth.wrongCredentials"));
  };

  const loginWithUsername = async (name) => {
    const { data, error: fnError } = await supabase.functions.invoke(
      "login-username",
      { body: { username: name, password } },
    );
    if (fnError) {
      const body = await Promise.resolve(fnError.context?.json?.()).catch(() => null);
      const reason = body?.error;
      if (reason === "invalid_credentials") return setError(t("auth.wrongCredentials"));
      if (reason === "email_not_confirmed") return setError(t("auth.confirmWithEmail"));
      if (reason === "rate_limited") return setError(t("auth.rateLimited"));
      return setError(t("auth.usernameLoginDown"));
    }
    const { error: sessionError } = await supabase.auth.setSession(data);
    if (sessionError) return setError(sessionError.message);
    navigate("/home", { replace: true });
  };

  const login = () => {
    const id = identifier.trim();
    return id.includes("@")
      ? loginWithEmail(id.toLowerCase())
      : loginWithUsername(id.toLowerCase());
  };

  const signup = async () => {
    const address = email.trim().toLowerCase();
    if (!USERNAME_RE.test(username)) return setError(t("auth.usernameRules"));
    if (password.length < 6) return setError(t("auth.shortPassword"));
    if (!accepted) return setError(t("auth.mustAccept"));

    const { data: free, error: rpcError } = await supabase.rpc("username_available", {
      p_username: username,
    });
    if (rpcError) return setError(rpcError.message);
    if (!free) {
      setUsernameState("taken");
      return setError(t("auth.usernameTaken"));
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: address,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (signUpError) return setError(signUpError.message);
    if (data.user && data.user.identities?.length === 0) {
      return setError(t("auth.alreadyRegistered"));
    }
    if (data.session) return navigate("/home", { replace: true }); // tasdiqlash o'chirilgan bo'lsa
    askForCode(address, t("auth.codeSentCreate", { email: address }));
  };

  const verify = async () => {
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) return setError(t("auth.enterCode"));

    // Supabase'da sign up kodi 'signup', email almashtirish kodi 'email' turiga tegishli.
    // Avvalgisini sinaymiz, u mos kelmasa ikkinchisini.
    let { error: verifyError } = await supabase.auth.verifyOtp({
      email: codeEmail,
      token,
      type: "signup",
    });
    if (verifyError) {
      ({ error: verifyError } = await supabase.auth.verifyOtp({
        email: codeEmail,
        token,
        type: "email",
      }));
    }
    if (verifyError) return setError(t("auth.badCode"));
    navigate("/home", { replace: true });
  };

  const sendReset = async () => {
    const address = resetEmail.trim().toLowerCase();
    if (!address.includes("@")) return setError(t("auth.enterEmail"));
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetError) return setError(resetError.message);
    // Email ro'yxatdan o'tganmi — aytmaymiz, aks holda begona odam tekshirib ko'ra oladi
    setInfo(t("auth.resetSent", { email: address }));
  };

  const resend = async () => {
    setError("");
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: codeEmail,
    });
    if (resendError) return setError(resendError.message);
    setCooldown(RESEND_SECONDS);
    setInfo(t("auth.newCodeSent", { email: codeEmail }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (stage === "form") setInfo("");
    setBusy(true);
    try {
      if (stage === "code") await verify();
      else if (stage === "forgot") await sendReset();
      else await (isLogin ? login() : signup());
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError("");
    setBusy(true);
    if (!(await providerEnabled("google"))) {
      setBusy(false);
      return setError(t("auth.googleDisabled"));
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    // Muvaffaqiyatda brauzer Google'ga o'tib ketadi; bu yerga faqat xatoda qaytamiz
    if (oauthError) {
      setError(oauthError.message);
      setBusy(false);
    }
  };

  const openForgot = () => {
    setStage("forgot");
    setResetEmail(identifier.includes("@") ? identifier.trim() : "");
    setError("");
    setInfo("");
  };

  const backToForm = () => {
    setStage("form");
    setCode("");
    setError("");
    setInfo("");
  };

  const heading =
    stage === "code"
      ? t("auth.checkEmail")
      : stage === "forgot"
        ? t("auth.forgotTitle")
        : null;

  const usernameHint = {
    checking: { cls: "text-mist", text: t("auth.usernameChecking") },
    free: { cls: "text-[#a6ee86]", text: t("auth.usernameFree") },
    taken: { cls: "text-rose", text: t("auth.usernameTaken") },
    idle: { cls: "text-mist", text: t("auth.usernameRules") },
  }[usernameState];

  const [acceptPre, acceptPost] = t("auth.accept").split("{link}");

  return (
    <div className="min-h-screen bg-night px-6 py-8 text-white">
      <Link to="/" aria-label={t("auth.backWelcome")}>
        <Logo className="text-3xl" />
      </Link>

      <div className="mx-auto mt-4 max-w-lg">
        {heading ? (
          <h1 className="text-center text-3xl font-extrabold">{heading}</h1>
        ) : (
          <div
            className="flex items-center justify-center gap-4 sm:gap-8"
            role="tablist"
            aria-label={t("auth.account")}
          >
            <Link to="/login" role="tab" aria-selected={isLogin} className={tabCls(isLogin)}>
              {t("auth.login")}
            </Link>
            <Link to="/signup" role="tab" aria-selected={!isLogin} className={tabCls(!isLogin)}>
              {t("auth.signup")}
            </Link>
          </div>
        )}

        <form onSubmit={submit} className="glass mt-8 space-y-5 rounded-[2.5rem] p-7 sm:p-10">
          {stage === "code" && (
            <>
              <Alert tone="info">{info}</Alert>
              <div>
                <label htmlFor="code" className={labelCls}>
                  {t("auth.code")}
                </label>
                <input
                  id="code"
                  ref={codeRef}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={`${authInput} text-center text-2xl font-bold tracking-[0.5em]`}
                />
              </div>
              <Alert tone="error">{error}</Alert>
              <div className="flex flex-col items-center gap-3 pt-2">
                <Btn type="submit" disabled={busy || code.length !== 6} className="px-12 py-3.5 text-base">
                  {busy ? t("auth.checking") : t("auth.verify")}
                </Btn>
                <button
                  type="button"
                  onClick={resend}
                  disabled={cooldown > 0}
                  className="text-sm text-mist underline disabled:no-underline disabled:opacity-60"
                >
                  {cooldown > 0 ? t("auth.resendIn", { s: cooldown }) : t("auth.resend")}
                </button>
                <button type="button" onClick={backToForm} className="text-sm text-mist underline">
                  {t("auth.otherEmail")}
                </button>
              </div>
            </>
          )}

          {stage === "forgot" && (
            <>
              <p className="text-sm text-mist">{t("auth.forgotHint")}</p>
              <div>
                <label htmlFor="reset-email" className={labelCls}>
                  {t("auth.email")}
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder={t("auth.emailPh")}
                  className={authInput}
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>
              <Alert tone="info">{info}</Alert>
              <Alert tone="error">{error}</Alert>
              <div className="flex flex-col items-center gap-3 pt-2">
                <Btn type="submit" disabled={busy} className="px-12 py-3.5 text-base">
                  {busy ? t("auth.wait") : t("auth.sendResetLink")}
                </Btn>
                <button type="button" onClick={backToForm} className="text-sm text-mist underline">
                  {t("auth.backToLogin")}
                </button>
              </div>
            </>
          )}

          {stage === "form" && (
            <>
              <button
                type="button"
                onClick={google}
                disabled={busy}
                className="flex w-full items-center justify-center gap-3 rounded-full bg-[#d9d9d9] py-3.5 text-sm font-semibold text-night transition-colors hover:bg-white disabled:opacity-60"
              >
                <GoogleIcon />
                {t("auth.google")}
              </button>

              <div className="flex items-center gap-4 text-xs text-mist" aria-hidden="true">
                <span className="h-px flex-1 bg-white/30" /> {t("auth.orEmail")}{" "}
                <span className="h-px flex-1 bg-white/30" />
              </div>

              <Alert tone="info">{info}</Alert>

              {isLogin ? (
                <div>
                  <label htmlFor="identifier" className={labelCls}>
                    {t("auth.usernameOrEmail")}
                  </label>
                  <input
                    id="identifier"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder={t("auth.usernameOrEmailPh")}
                    className={authInput}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="email" className={labelCls}>
                      {t("auth.email")}
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder={t("auth.emailPh")}
                      className={authInput}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="username" className={labelCls}>
                      {t("auth.username")}
                    </label>
                    <input
                      id="username"
                      required
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder={t("auth.usernamePh")}
                      className={authInput}
                      value={username}
                      onChange={(e) => setUsername(cleanUsername(e.target.value))}
                      aria-describedby="username-hint"
                    />
                    <p id="username-hint" className={`mt-1.5 px-1 text-xs ${usernameHint.cls}`}>
                      {usernameHint.text}
                    </p>
                  </div>
                </>
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <label htmlFor="password" className="text-xs">
                    {t("auth.password")}
                  </label>
                  {isLogin && (
                    <button type="button" onClick={openForgot} className="text-xs text-leaf hover:underline">
                      {t("auth.forgot")}
                    </button>
                  )}
                </div>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  minLength={isLogin ? undefined : 6}
                  placeholder={isLogin ? t("auth.passwordPh") : t("auth.passwordPhNew")}
                />
              </div>

              {!isLogin && (
                <label className="flex items-start gap-3 px-1 text-sm">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[#55b435]"
                  />
                  <span className="text-white/90">
                    {acceptPre}
                    <Link to="/privacy" target="_blank" className="font-semibold text-leaf underline">
                      {t("auth.privacyLink")}
                    </Link>
                    {acceptPost}
                  </span>
                </label>
              )}

              <Alert tone="error">{error}</Alert>

              <div className="flex justify-center pt-2">
                <Btn
                  type="submit"
                  disabled={busy || (!isLogin && (!accepted || usernameState === "taken"))}
                  className="px-12 py-3.5 text-base"
                >
                  {busy ? t("auth.wait") : isLogin ? t("auth.login") : t("auth.signup")}
                </Btn>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
