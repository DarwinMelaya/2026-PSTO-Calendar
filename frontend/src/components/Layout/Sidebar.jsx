import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { clearSession, getSession } from "../../utils/session";

const userInitials = (user) => {
  const base =
    user?.name?.trim() || user?.code_name?.trim() || user?.email?.trim() || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
};

const iconClass = "h-5 w-5 shrink-0";

const TaskIcon = () => (
  <svg
    className={iconClass}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
    />
  </svg>
);

const UsersIcon = () => (
  <svg
    className={iconClass}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const HomeIcon = () => (
  <svg
    className={iconClass}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
    />
  </svg>
);

const ProfileIcon = () => (
  <svg
    className={iconClass}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 19.125a7.5 7.5 0 0115 0v.75H4.5v-.75z"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    className={iconClass}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 2.25v1.5M17.25 2.25v1.5M3 8.25h18M4.5 4.5h15A1.5 1.5 0 0121 6v14.25A1.5 1.5 0 0119.5 21h-15A1.5 1.5 0 013 20.25V6a1.5 1.5 0 011.5-1.5zm3 7.5h.008v.008H7.5V12zm3.75 0h.008v.008H11.25V12zm3.75 0h.008v.008H15V12zM7.5 15.75h.008v.008H7.5v-.008zm3.75 0h.008v.008H11.25v-.008zm3.75 0h.008v.008H15v-.008z"
    />
  </svg>
);

const SearchIcon = () => (
  <svg
    className="h-4 w-4 text-slate-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

const DOST_LOGO_SRC = "/Assets/dostlogo.png";

const panelLinkClass = ({ isActive }) =>
  `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
    isActive
      ? "bg-slate-600/70 text-white"
      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
  }`;

const CollapsibleSection = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-2 flex w-full items-center gap-2 py-1 text-left"
      >
        <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <span className="text-sm leading-none text-slate-500 tabular-nums">
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? <div className="flex flex-col gap-0.5">{children}</div> : null}
    </div>
  );
};

const BurgerIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

const CloseIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const Sidebar = () => {
  const navigate = useNavigate();
  const user = getSession();
  const displayName = user?.name || user?.code_name || user?.email || "Admin";
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    clearSession();
    toast.success("Logged out successfully.");
    navigate("/", { replace: true });
  };

  const navFilter = (label) =>
    label.toLowerCase().includes(query.trim().toLowerCase());

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 lg:hidden">
        <div
          className="pointer-events-none absolute inset-0 border-b border-slate-200/50 bg-gradient-to-b from-white/85 via-white/70 to-white/55 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.18)] backdrop-blur-2xl backdrop-saturate-150 [-webkit-backdrop-filter:blur(20px)_saturate(1.8)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/55 to-transparent"
          aria-hidden
        />

        <div className="relative flex h-[3.75rem] items-center justify-between gap-3 px-4 pt-[max(0px,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-11 items-center gap-2.5 rounded-2xl bg-white/50 px-3.5 text-sm font-semibold text-slate-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_2px_8px_-2px_rgba(15,23,42,0.15)] ring-1 ring-slate-900/[0.06] backdrop-blur-md transition active:scale-[0.98] hover:bg-white/70"
            aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
            aria-controls="admin-sidebar"
            aria-expanded={mobileOpen}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-sm">
              {mobileOpen ? <CloseIcon /> : <BurgerIcon />}
            </span>
            <span className="tracking-tight">
              {mobileOpen ? "Close" : "Menu"}
            </span>
          </button>

          <div className="flex min-w-0 max-w-[58%] items-center gap-2.5 rounded-2xl bg-white/45 py-1.5 pl-1.5 pr-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85)] ring-1 ring-slate-900/[0.05] backdrop-blur-md">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white shadow-md shadow-violet-500/25 ring-2 ring-white/90"
              aria-hidden
            >
              {userInitials(user)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight tracking-tight text-slate-900">
                {displayName}
              </p>
              <p className="truncate text-[11px] font-medium text-slate-500">
                Administrator
              </p>
            </div>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar overlay"
        />
      ) : null}

      <aside
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex min-h-screen w-72 shrink-0 flex-col bg-[#0f172a] px-4 py-5 shadow-[4px_0_24px_rgba(0,0,0,0.12)] transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:min-h-0 lg:w-64 lg:translate-x-0 lg:overflow-y-auto ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:shadow-none`}
        aria-label="Admin sidebar"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <img
              src={DOST_LOGO_SRC}
              alt="Department of Science and Technology logo"
              className="h-11 w-11 shrink-0 rounded-lg bg-white/95 object-contain p-1"
            />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold tracking-tight text-white">
                MARINDUQUE
              </h2>
              <p className="truncate text-xs font-medium text-slate-400">
                PSTO Calendar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="shrink-0 rounded-xl px-2 py-2 text-slate-200 hover:bg-slate-900/40 lg:hidden"
            aria-label="Close sidebar"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="relative mt-5">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full rounded-xl border border-slate-700/60 bg-slate-800/50 py-2.5 pl-10 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-600/40"
            aria-label="Search navigation"
          />
        </div>

        <nav
          className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto pb-4"
          aria-label="Admin navigation"
        >
          <CollapsibleSection title="Dashboard" defaultOpen>
            {navFilter("Overview") ? (
              <NavLink
                to="/admin-dashboard"
                end
                className={panelLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                <HomeIcon />
                Dashboard
              </NavLink>
            ) : null}
            {navFilter("Tasks") ? (
              <NavLink
                to="/admin-add-task"
                className={panelLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                <TaskIcon />
                Tasks
              </NavLink>
            ) : null}
            {navFilter("Users") ? (
              <NavLink
                to="/admin-add-users"
                className={panelLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                <UsersIcon />
                Users
              </NavLink>
            ) : null}
            {navFilter("Calendar") ? (
              <NavLink
                to="/admin-calendar"
                className={panelLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                <CalendarIcon />
                Calendar
              </NavLink>
            ) : null}
            {navFilter("Profile") ? (
              <NavLink
                to="/admin-profile"
                className={panelLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                <ProfileIcon />
                Profile
              </NavLink>
            ) : null}
            {query.trim() &&
            !navFilter("Overview") &&
            !navFilter("Tasks") &&
            !navFilter("Users") &&
            !navFilter("Calendar") &&
            !navFilter("Profile") ? (
              <p className="px-3 py-2 text-xs text-slate-500">No matches</p>
            ) : null}
          </CollapsibleSection>
        </nav>

        <div className="mt-auto border-t border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-400/90 transition-colors hover:bg-rose-950/40 hover:text-rose-300"
          >
            Log out
          </button>
          <p className="mt-3 px-1 text-xs text-slate-600">
            PSTO Calendar · Admin
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
