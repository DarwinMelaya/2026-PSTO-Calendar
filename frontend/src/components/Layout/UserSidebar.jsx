import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { clearSession } from "../../utils/session";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const iconClass = "h-4.5 w-4.5 shrink-0";

const HomeIcon = () => (
  <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);

const TaskIcon = () => (
  <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
  </svg>
);

const ProjectTimelineIcon = () => (
  <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3.75v16.5M8.25 7.5h10.5M8.25 12h7.5M8.25 16.5h12" />
  </svg>
);

const ProfileIcon = () => (
  <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 19.125a7.5 7.5 0 0115 0v.75H4.5v-.75z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOST_LOGO_SRC = "/Assets/dostlogo.png";

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

const navItemClass = ({ isActive }) =>
  `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all duration-150 ${
    isActive
      ? "bg-white/10 text-white shadow-sm"
      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
  }`;

const mobileNavLinkClass = ({ isActive }) =>
  `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-[10px] font-medium transition-colors sm:text-xs ${
    isActive ? "text-white" : "text-slate-500 active:text-slate-300"
  }`;

// ---------------------------------------------------------------------------
// Nav section label
// ---------------------------------------------------------------------------

const NavSectionLabel = ({ children }) => (
  <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600 first:mt-0">
    {children}
  </p>
);

// ---------------------------------------------------------------------------
// Main UserSidebar
// ---------------------------------------------------------------------------

const UserSidebar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleLogout = () => {
    clearSession();
    toast.success("Logged out successfully.");
    navigate("/", { replace: true });
  };

  const navFilter = (label) =>
    label.toLowerCase().includes(query.trim().toLowerCase());

  const hasNoMatches =
    query.trim() &&
    !navFilter("Dashboard") &&
    !navFilter("My tasks") &&
    !navFilter("Project Timeline") &&
    !navFilter("Profile");

  return (
    <>
      {/* ── Mobile bottom nav ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/5 bg-[#0d1424] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-1px_0_0_rgba(255,255,255,0.04)] lg:hidden"
        aria-label="User mobile navigation"
      >
        <NavLink to="/user-dashboard" end className={mobileNavLinkClass}>
          <HomeIcon />
          <span className="truncate">Home</span>
        </NavLink>
        <NavLink to="/user-task" className={mobileNavLinkClass}>
          <TaskIcon />
          <span className="truncate">Tasks</span>
        </NavLink>
        <NavLink to="/user-project-timeline" className={mobileNavLinkClass}>
          <ProjectTimelineIcon />
          <span className="truncate">Timeline</span>
        </NavLink>
        <NavLink to="/user-profile" className={mobileNavLinkClass}>
          <ProfileIcon />
          <span className="truncate">Profile</span>
        </NavLink>
      </nav>

      {/* ── Desktop sidebar ── */}
      <aside
        id="user-sidebar"
        className="hidden min-h-screen w-60 shrink-0 flex-col bg-[#0d1424] lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto"
        aria-label="User sidebar"
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-5">
          <img
            src={DOST_LOGO_SRC}
            alt="Department of Science and Technology logo"
            className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-1 shadow-md"
          />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-widest text-blue-400">
              DOST MARINDUQUE
            </p>
            <p className="truncate text-xs text-slate-500">PSTO Calendar</p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-white/5" />

        {/* Search */}
        <div className="relative mx-4 mt-4">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full rounded-lg border border-white/5 bg-white/5 py-2 pl-9 pr-3 text-sm text-slate-300 placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            aria-label="Search navigation"
          />
        </div>

        {/* Nav */}
        <nav
          className="mt-4 flex flex-1 flex-col overflow-y-auto px-3 pb-4"
          aria-label="User navigation"
        >
          <NavSectionLabel>Main</NavSectionLabel>

          {navFilter("Dashboard") && (
            <NavLink to="/user-dashboard" end className={navItemClass}>
              <HomeIcon />
              <span className="truncate">Dashboard</span>
            </NavLink>
          )}
          {navFilter("My tasks") && (
            <NavLink to="/user-task" className={navItemClass}>
              <TaskIcon />
              <span className="truncate">My Tasks</span>
            </NavLink>
          )}

          {navFilter("Project Timeline") && (
            <>
              <NavSectionLabel>Planning</NavSectionLabel>
              <NavLink to="/user-project-timeline" className={navItemClass}>
                <ProjectTimelineIcon />
                <span className="truncate">Project Timeline</span>
              </NavLink>
            </>
          )}

          {navFilter("Profile") && (
            <>
              <NavSectionLabel>Account</NavSectionLabel>
              <NavLink to="/user-profile" className={navItemClass}>
                <ProfileIcon />
                <span className="truncate">Profile</span>
              </NavLink>
            </>
          )}

          {hasNoMatches && (
            <p className="mt-2 px-3 text-xs text-slate-600">No results for &ldquo;{query}&rdquo;</p>
          )}
        </nav>

        {/* Footer */}
        <div className="mx-4 border-t border-white/5 pb-5 pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
          >
            <LogoutIcon />
            Log out
          </button>
          <p className="mt-3 px-3 text-[10px] text-slate-700">
            PSTO Calendar &middot; User
          </p>
        </div>
      </aside>
    </>
  );
};

export default UserSidebar;
