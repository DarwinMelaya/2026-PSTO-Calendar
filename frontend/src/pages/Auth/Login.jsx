import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PasswordInput from "../../components/Auth/PasswordInput";
import { loginProfile } from "../../utils/profile";
import { setSession } from "../../utils/session";

const MailIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden="true"
    {...props}
  >
    <path d="M4 4h16v16H4z" opacity="0.15" />
    <path d="M4 6.5 12 12l8-5.5" />
    <path d="M4 6.5V20h16V6.5" />
  </svg>
);

const LockIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden="true"
    {...props}
  >
    <path d="M7 11V8a5 5 0 0 1 10 0v3" />
    <path d="M6 11h12v10H6z" />
  </svg>
);

const DOST_LOGO_SRC = "/Assets/dostlogo.png";

const DobstLogo = ({ className = "h-10 w-10" }) => (
  <img
    src={DOST_LOGO_SRC}
    alt="Department of Science and Technology logo"
    className={`shrink-0 object-contain ${className}`}
  />
);

const REMEMBER_LOGIN_KEY = "dost_remember_login";

const loadRememberedLogin = () => {
  try {
    const raw = localStorage.getItem(REMEMBER_LOGIN_KEY);
    if (!raw) {
      return { email: "", password: "", rememberMe: false };
    }
    const parsed = JSON.parse(raw);
    return {
      email: typeof parsed.email === "string" ? parsed.email : "",
      password: typeof parsed.password === "string" ? parsed.password : "",
      rememberMe: true,
    };
  } catch {
    return { email: "", password: "", rememberMe: false };
  }
};

const saveRememberedLogin = (email, password) => {
  localStorage.setItem(
    REMEMBER_LOGIN_KEY,
    JSON.stringify({ email, password }),
  );
};

const clearRememberedLogin = () => {
  localStorage.removeItem(REMEMBER_LOGIN_KEY);
};

const Spinner = () => (
  <svg
    className="h-5 w-5 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
    />
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const initialRemembered = loadRememberedLogin();
  const [email, setEmail] = useState(initialRemembered.email);
  const [password, setPassword] = useState(initialRemembered.password);
  const [rememberMe, setRememberMe] = useState(initialRemembered.rememberMe);
  const [loading, setLoading] = useState(false);

  const handleRememberMeChange = (e) => {
    const checked = e.target.checked;
    setRememberMe(checked);
    if (!checked) {
      clearRememberedLogin();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await loginProfile({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (!data) {
      toast.error("Invalid email or password.");
      return;
    }

    if (rememberMe) {
      saveRememberedLogin(email.trim(), password);
    } else {
      clearRememberedLogin();
    }

    setSession(data);
    toast.success("Logged in successfully!");
    navigate(data.role === "admin" ? "/admin-dashboard" : "/user-dashboard");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -right-28 top-10 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full grid-cols-1 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-black/40 backdrop-blur-xl md:grid-cols-2">
          <div className="hidden p-10 md:block">
            <div className="flex items-center gap-3">
              <DobstLogo className="h-12 w-12" />
              <div>
                <div className="text-sm font-semibold tracking-wide text-white/90">
                  DOST MARINDUQUE TASK MANAGEMENT SYSTEM
                </div>
                <div className="text-xs text-white/60">
                  Manage tasks, schedules, and calendar events with a faster,
                  cleaner experience.
                </div>
              </div>
            </div>

            <div className="mt-10 space-y-4">
              <h2 className="text-3xl font-bold leading-tight text-white">
                Welcome back.
                <span className="block text-white/70">
                  Secure access to your dashboard.
                </span>
              </h2>
              <p className="max-w-sm text-sm leading-relaxed text-white/60">
                Sign in to manage schedules, tasks, and calendar events with a
                faster, cleaner experience.
              </p>
            </div>
          </div>

          <div className="bg-white px-6 py-10 sm:px-10">
            <div className="mx-auto w-full max-w-md">
              <div className="flex items-center justify-between">
                <div className="md:hidden">
                  <div className="flex items-center gap-3">
                    <DobstLogo className="h-10 w-10" />
                    <div className="text-sm font-semibold text-slate-900">
                      DOST Marinduque Task Management System
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col items-center md:items-start">
                <DobstLogo className="mb-6 h-16 w-16 sm:h-20 sm:w-20 md:hidden" />
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  Log in
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Use your credentials to continue.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Email
                  </label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <MailIcon />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Password
                    </label>
                    <span className="text-xs text-slate-500">
                      Min. 6 characters
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <PasswordInput
                      id="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      disabled={loading}
                      leftAdornment={<LockIcon />}
                      inputClassName="rounded-xl"
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer select-none items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={handleRememberMeChange}
                    disabled={loading}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Spinner />
                      Signing in…
                    </>
                  ) : (
                    "Continue"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
