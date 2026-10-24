import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Logo from "../components/Logo";
import PasswordInput from "../components/PasswordInput";
import { Btn, authInput } from "../components/ui";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 96 }, (_, i) => thisYear - 5 - i);
const RESEND_SECONDS = 60;

const tabCls = (active) =>
  `rounded-full px-7 py-2.5 text-2xl font-extrabold sm:px-9 sm:py-3 sm:text-3xl ${
    active ? "glass text-leaf" : "text-white hover:text-leaf"
  }`;

export default function Auth({ mode }) {
  const isLogin = mode === "login";
  const navigate = useNavigate();
  const { state } = useLocation();

  const [email, setEmail] = useState(state?.email || "");
  const [password, setPassword] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(state?.notice || "");
  const [busy, setBusy] = useState(false);

  // Tasdiqlash kodi bosqichi
  const [stage, setStage] = useState("form"); // form | code
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef(null);

  const cleanEmail = email.trim().toLowerCase();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (stage === "code") codeRef.current?.focus();
  }, [stage]);

  const login = async () => {
    const { data: exists, error: rpcError } = await supabase.rpc(
      "email_exists",
      { p_email: cleanEmail },
    );
    if (rpcError) return setError(rpcError.message);
    if (!exists) {
      return navigate("/signup", {
        state: {
          email: cleanEmail,
          notice:
            "This email is not registered yet. Create an account to continue.",
        },
      });
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (signInError) {
      const msg = signInError.message.toLowerCase();
      if (msg.includes("confirm")) {
        // Akkaunt bor, lekin email hali tasdiqlanmagan: kod yuboramiz
        await supabase.auth.resend({ type: "signup", email: cleanEmail });
        setStage("code");
        setCooldown(RESEND_SECONDS);
        setInfo(
          `We sent a 6-digit code to ${cleanEmail}. Enter it to finish verifying your account.`,
        );
        return;
      }
      return setError(
        "Wrong password. If you signed up with Google, use the Google button.",
      );
    }
    navigate("/home", { replace: true });
  };

  const signup = async () => {
    const d = Number(day),
      m = Number(month),
      y = Number(year);
    const dt = new Date(y, m - 1, d);
    if (
      !d ||
      !m ||
      !y ||
      dt.getFullYear() !== y ||
      dt.getMonth() !== m - 1 ||
      dt.getDate() !== d
    ) {
      return setError("Enter a valid birth date.");
    }
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");

    const birth = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { birth_date: birth } },
    });
    if (signUpError) return setError(signUpError.message);

    if (data.user && data.user.identities?.length === 0) {
      return setError("This email is already registered. Log in instead.");
    }
    if (data.session) return navigate("/home", { replace: true }); // tasdiqlash o'chirilgan bo'lsa

    setStage("code");
    setCooldown(RESEND_SECONDS);
    setInfo(
      `We sent a 6-digit code to ${cleanEmail}. Enter it below to create your account.`,
    );
  };

    const verify = async () => {
    const token = code.replace(/\D/g, '');
    if (token.length !== 6) return setError('Enter the 6-digit code from your email.');

    // Supabase'da sign up kodi 'signup', email almashtirish kodi 'email' turiga tegishli.
    // Avvalgisini sinaymiz, u mos kelmasa ikkinchisini.
    let { error: verifyError } = await supabase.auth.verifyOtp({ email: cleanEmail, token, type: 'signup' });
    if (verifyError) {
      ({ error: verifyError } = await supabase.auth.verifyOtp({ email: cleanEmail, token, type: 'email' }));
    }
    if (verifyError) {
      return setError('That code did not work. Make sure it is the newest one, or send a new code.');
    }
    navigate('/home', { replace: true });
  };

  const resend = async () => {
    setError("");
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: cleanEmail,
    });
    if (resendError) return setError(resendError.message);
    setCooldown(RESEND_SECONDS);
    setInfo(`A new code is on its way to ${cleanEmail}.`);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (stage !== "code") setInfo("");
    setBusy(true);
    try {
      if (stage === "code") await verify();
      else await (isLogin ? login() : signup());
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError("");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/home` },
    });
    if (oauthError) setError(oauthError.message);
  };

  const backToForm = () => {
    setStage("form");
    setCode("");
    setError("");
    setInfo("");
  };

  return (
    <div className="min-h-screen bg-night px-6 py-8 text-white">
      <Link to="/" aria-label="Back to welcome page">
        <Logo className="text-3xl" />
      </Link>

      <div className="mx-auto mt-4 max-w-lg">
        {stage === "form" ? (
          <div
            className="flex items-center justify-center gap-4 sm:gap-8"
            role="tablist"
            aria-label="Account"
          >
            <Link
              to="/login"
              role="tab"
              aria-selected={isLogin}
              className={tabCls(isLogin)}
            >
              Login
            </Link>
            <Link
              to="/signup"
              role="tab"
              aria-selected={!isLogin}
              className={tabCls(!isLogin)}
            >
              Sign up
            </Link>
          </div>
        ) : (
          <h1 className="text-center text-3xl font-extrabold">
            Check your email
          </h1>
        )}

        <form
          onSubmit={submit}
          className="glass mt-8 space-y-5 rounded-[2.5rem] p-7 sm:p-10"
        >
          {stage === "code" ? (
            <>
              {info && (
                <p
                  role="status"
                  className="rounded-xl bg-leaf/15 px-4 py-3 text-sm text-[#a6ee86]"
                >
                  {info}
                </p>
              )}

              <div>
                <label htmlFor="code" className="mb-1.5 block px-1 text-xs">
                  6-digit code
                </label>
                <input
                  id="code"
                  ref={codeRef}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className={`${authInput} text-center text-2xl font-bold tracking-[0.5em]`}
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-rose/15 px-4 py-3 text-sm text-rose"
                >
                  {error}
                </p>
              )}

              <div className="flex flex-col items-center gap-3 pt-2">
                <Btn
                  type="submit"
                  disabled={busy || code.length !== 6}
                  className="px-12 py-3.5 text-base"
                >
                  {busy ? "Checking…" : "Verify and continue"}
                </Btn>
                <button
                  type="button"
                  onClick={resend}
                  disabled={cooldown > 0}
                  className="text-sm text-mist underline disabled:no-underline disabled:opacity-60"
                >
                  {cooldown > 0
                    ? `Send a new code in ${cooldown}s`
                    : "Send a new code"}
                </button>
                <button
                  type="button"
                  onClick={backToForm}
                  className="text-sm text-mist underline"
                >
                  Use a different email
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={google}
                className="w-full rounded-full bg-[#d9d9d9] py-3.5 text-sm font-medium text-night hover:bg-white"
              >
                Continue with Google
              </button>

              <div
                className="flex items-center gap-4 text-xs text-mist"
                aria-hidden="true"
              >
                <span className="h-px flex-1 bg-white/30" /> or email{" "}
                <span className="h-px flex-1 bg-white/30" />
              </div>

              {info && (
                <p
                  role="status"
                  className="rounded-xl bg-leaf/15 px-4 py-3 text-sm text-[#a6ee86]"
                >
                  {info}
                </p>
              )}

              <div>
                <label htmlFor="email" className="mb-1.5 block px-1 text-xs">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={authInput}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block px-1 text-xs">
                  Password
                </label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  minLength={isLogin ? undefined : 6}
                />
              </div>

              {!isLogin && (
                <fieldset>
                  <legend className="mb-1.5 px-1 text-xs">
                    Enter your birth date
                  </legend>
                  <div className="grid grid-cols-3 gap-3">
                    <select
                      aria-label="Day"
                      required
                      className={authInput}
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                    >
                      <option value="">day</option>
                      {Array.from({ length: 31 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Month"
                      required
                      className={authInput}
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                    >
                      <option value="">month</option>
                      {MONTHS.map((n, i) => (
                        <option key={n} value={i + 1}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Year"
                      required
                      className={authInput}
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                    >
                      <option value="">year</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </fieldset>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-rose/15 px-4 py-3 text-sm text-rose"
                >
                  {error}
                </p>
              )}

              <div className="flex justify-center pt-2">
                <Btn
                  type="submit"
                  disabled={busy}
                  className="px-12 py-3.5 text-base"
                >
                  {busy ? "Please wait…" : isLogin ? "Login" : "Sign up"}
                </Btn>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
