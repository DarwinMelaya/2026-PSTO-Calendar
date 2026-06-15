import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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

const UsersIcon = () => (
  <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 2.25v1.5M17.25 2.25v1.5M3 8.25h18M4.5 4.5h15A1.5 1.5 0 0121 6v14.25A1.5 1.5 0 0119.5 21h-15A1.5 1.5 0 013 20.25V6a1.5 1.5 0 011.5-1.5zm3 7.5h.008v.008H7.5V12zm3.75 0h.008v.008H11.25V12zm3.75 0h.008v.008H15V12zM7.5 15.75h.008v.008H7.5v-.008zm3.75 0h.008v.008H11.25v-.008zm3.75 0h.008v.008H15v-.008z" />
  </svg>
);

const ProjectTimelineIcon = () => (
  <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3.75v16.5M8.25 7.5h10.5M8.25 12h7.5M8.25 16.5h12" />
  </svg>
);

const MonitoringIcon = () => (
  <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const ProfileIcon = () => (
  <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 19.125a7.5 7.5 0 0115 0v.75H4.5v-.75z" />
  </svg>
);

const CtoIcon = () => (
  <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
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

const ChevronIcon = ({ open }) => (
  <svg
    className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOST_LOGO_SRC = "/Assets/dostlogo.png";

const MONITORING_NAV = [
  { label: "All Projects",  to: "/admin-all-projects-monitoring", searchTerms: ["All Projects", "All Projects Monitoring", "Monitoring"] },
  { label: "GIA",           to: "/admin-gia",   searchTerms: ["GIA"] },
  { label: "SETUP",         to: "/admin-setup", searchTerms: ["SETUP", "Setup"] },
  { label: "CEST",          to: "/admin-cest",  searchTerms: ["CEST", "Cest"] },
  { label: "SSCP",          to: "/admin-sscp",  searchTerms: ["SSCP", "Sscp"] },
];

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

const navItemClass = ({ isActive }) =>
  `group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all duration-150 ${
    isActive
      ? "bg-white/10 text-white shadow-sm"
      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
  }`;

const subNavItemClass = ({ isActive }) =>
  `flex w-full items-center gap-2 rounded-lg py-1.5 pl-9 pr-3 text-left text-sm transition-all duration-150 ${
    isActive
      ? "font-semibold text-white"
      : "font-medium text-slate-500 hover:text-slate-300"
  }`;

const mobileNavLinkClass = ({ isActive }) =>
  `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors sm:text-xs ${
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
// Active indicator dot for sub-items
// ---------------------------------------------------------------------------

const ActiveDot = ({ isActive }) =>
  isActive ? (
    <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
  ) : null;

// ---------------------------------------------------------------------------
// Monitoring nav group (collapsible)
// ---------------------------------------------------------------------------

const monitoringNavMatches = (navFilter) =>
  MONITORING_NAV.some((item) => item.searchTerms.some((term) => navFilter(term)));

const MonitoringNavGroup = ({ query, navFilter }) => {
  const location = useLocation();
  const isActiveSection = MONITORING_NAV.some((item) => location.pathname === item.to);
  const [open, setOpen] = useState(isActiveSection);

  const prevActive = useRef(isActiveSection);
  useEffect(() => {
    if (isActiveSection && !prevActive.current) setOpen(true);
    prevActive.current = isActiveSection;
  }, [isActiveSection]);

  const visibleItems = MONITORING_NAV.filter(
    (item) => !query.trim() || item.searchTerms.some((term) => navFilter(term)),
  );

  useEffect(() => {
    if (query.trim() && visibleItems.length > 0) setOpen(true);
  }, [query, visibleItems.length]);

  if (visibleItems.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all duration-150 ${
          isActiveSection
            ? "bg-white/10 text-white shadow-sm"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        }`}
      >
        <MonitoringIcon />
        <span className="flex-1 truncate">Monitoring</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="mt-0.5 flex flex-col">
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={subNavItemClass}>
              {({ isActive }) => (
                <>
                  <span
                    className={`h-1 w-1 shrink-0 rounded-full transition-colors ${
                      isActive ? "bg-blue-400" : "bg-slate-700 group-hover:bg-slate-500"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                  <ActiveDot isActive={isActive} />
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Sidebar
// ---------------------------------------------------------------------------

const Sidebar = () => {
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
    !navFilter("Tasks") &&
    !navFilter("Users") &&
    !navFilter("CTO") &&
    !navFilter("Calendar") &&
    !navFilter("Project Timeline") &&
    !navFilter("Profile") &&
    !monitoringNavMatches(navFilter);

  return (
    <>
      {/* ── Mobile bottom nav ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/5 bg-[#0d1424] px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-1px_0_0_rgba(255,255,255,0.04)] lg:hidden"
        aria-label="Admin mobile navigation"
      >
        <NavLink to="/admin-dashboard" end className={mobileNavLinkClass}>
          <HomeIcon />
          <span className="truncate">Home</span>
        </NavLink>
        <NavLink to="/admin-add-task" className={mobileNavLinkClass}>
          <TaskIcon />
          <span className="truncate">Tasks</span>
        </NavLink>
        <NavLink to="/admin-add-users" className={mobileNavLinkClass}>
          <UsersIcon />
          <span className="truncate">Users</span>
        </NavLink>
        <NavLink to="/admin-add-cto" className={mobileNavLinkClass}>
          <CtoIcon />
          <span className="truncate">CTO</span>
        </NavLink>
        <NavLink to="/admin-calendar" className={mobileNavLinkClass}>
          <CalendarIcon />
          <span className="truncate">Calendar</span>
        </NavLink>
        <NavLink to="/admin-project-timeline" className={mobileNavLinkClass}>
          <ProjectTimelineIcon />
          <span className="truncate">Timeline</span>
        </NavLink>
        <NavLink to="/admin-all-projects-monitoring" className={mobileNavLinkClass}>
          <MonitoringIcon />
          <span className="truncate">Monitor</span>
        </NavLink>
        <NavLink to="/admin-profile" className={mobileNavLinkClass}>
          <ProfileIcon />
          <span className="truncate">Profile</span>
        </NavLink>
      </nav>

      {/* ── Desktop sidebar ── */}
      <aside
        id="admin-sidebar"
        className="hidden min-h-screen w-60 shrink-0 flex-col bg-[#0d1424] lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto"
        aria-label="Admin sidebar"
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
            className="w-full rounded-lg border border-white/5 bg-white/5 py-2 pl-9 pr-3 text-sm text-slate-300 placeholder:text-slate-600 focus:border-blue-500/50 focus:bg-white/8 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            aria-label="Search navigation"
          />
        </div>

        {/* Nav */}
        <nav
          className="mt-4 flex flex-1 flex-col overflow-y-auto px-3 pb-4"
          aria-label="Admin navigation"
        >
          <NavSectionLabel>Main</NavSectionLabel>

          {navFilter("Dashboard") && (
            <NavLink to="/admin-dashboard" end className={navItemClass}>
              <HomeIcon />
              <span className="truncate">Dashboard</span>
            </NavLink>
          )}
          {navFilter("Tasks") && (
            <NavLink to="/admin-add-task" className={navItemClass}>
              <TaskIcon />
              <span className="truncate">Tasks</span>
            </NavLink>
          )}
          {navFilter("Users") && (
            <NavLink to="/admin-add-users" className={navItemClass}>
              <UsersIcon />
              <span className="truncate">Users</span>
            </NavLink>
          )}
          {navFilter("CTO") && (
            <NavLink to="/admin-add-cto" className={navItemClass}>
              <CtoIcon />
              <span className="truncate">CTO</span>
            </NavLink>
          )}

          {(navFilter("Calendar") ||
            navFilter("Project Timeline") ||
            monitoringNavMatches(navFilter)) && (
            <NavSectionLabel>Planning</NavSectionLabel>
          )}

          {navFilter("Calendar") && (
            <NavLink to="/admin-calendar" className={navItemClass}>
              <CalendarIcon />
              <span className="truncate">Calendar</span>
            </NavLink>
          )}
          {navFilter("Project Timeline") && (
            <NavLink to="/admin-project-timeline" className={navItemClass}>
              <ProjectTimelineIcon />
              <span className="truncate">Project Timeline</span>
            </NavLink>
          )}
          <MonitoringNavGroup query={query} navFilter={navFilter} />

          {navFilter("Profile") && (
            <>
              <NavSectionLabel>Account</NavSectionLabel>
              <NavLink to="/admin-profile" className={navItemClass}>
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
            PSTO Calendar &middot; Admin
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
