import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { clearSession } from "../../utils/session";

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

const Sidebar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleLogout = () => {
    clearSession();
    toast.success("Logged out successfully.");
    navigate("/login", { replace: true });
  };

  const navFilter = (label) =>
    label.toLowerCase().includes(query.trim().toLowerCase());

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col bg-[#0f172a] px-4 py-5 shadow-[4px_0_24px_rgba(0,0,0,0.12)]">
      <h2 className="text-xl font-bold tracking-tight text-white">Dashboard</h2>

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
            <NavLink to="/admin-dashboard" end className={panelLinkClass}>
              <HomeIcon />
              Dashboard
            </NavLink>
          ) : null}
          {navFilter("Tasks") ? (
            <NavLink to="/admin-add-task" className={panelLinkClass}>
              <TaskIcon />
              Tasks
            </NavLink>
          ) : null}
          {navFilter("Users") ? (
            <NavLink to="/admin-add-users" className={panelLinkClass}>
              <UsersIcon />
              Users
            </NavLink>
          ) : null}
          {query.trim() &&
          !navFilter("Overview") &&
          !navFilter("Tasks") &&
          !navFilter("Users") ? (
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
  );
};

export default Sidebar;
