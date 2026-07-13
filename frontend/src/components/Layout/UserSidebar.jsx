import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { clearSession, getSession } from "../../utils/session";

const iconClass = "h-[1.125rem] w-[1.125rem] shrink-0";

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

const LinksIcon = () => (
  <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);

const CtoIcon = () => (
  <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
  </svg>
);

const ContactIcon = () => (
  <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="h-4 w-4 text-sky-100/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);

const DOST_LOGO_SRC = "/Assets/dostlogo.png";

const GlassBackdrop = ({ horizontal = false }) => (
  <>
    <div
      className={
        horizontal
          ? "absolute inset-0 bg-gradient-to-r from-sky-700/95 via-blue-800/92 to-indigo-950/96"
          : "absolute inset-0 bg-gradient-to-b from-sky-700/95 via-blue-800/92 to-indigo-950/96"
      }
    />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.22),_transparent_55%)]" />
    <div className="absolute inset-0 bg-white/5 backdrop-blur-xl" />
  </>
);

const navItemClass = ({ isActive }) =>
  `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 border ${
    isActive
      ? "bg-white/15 border-sky-300/40 text-white shadow-[0_0_18px_rgba(56,189,248,0.28)] backdrop-blur-sm"
      : "bg-transparent border-transparent text-sky-100/85 hover:bg-white/10 hover:border-white/15 hover:text-white"
  }`;

const mobileNavLinkClass = ({ isActive }) =>
  `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-[10px] font-semibold tracking-wide transition-all ${
    isActive
      ? "bg-white/20 text-white shadow-[0_0_14px_rgba(186,230,253,0.25)]"
      : "text-sky-100/80 active:bg-white/10"
  }`;

const NavSectionLabel = ({ children }) => (
  <p className="mb-1.5 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200/55 first:mt-0">
    {children}
  </p>
);

const UserSidebar = () => {
  const navigate = useNavigate();
  const session = getSession();
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
    !navFilter("Links") &&
    !navFilter("Admin Links") &&
    !navFilter("CTO") &&
    !navFilter("Contacts") &&
    !navFilter("Contact") &&
    !navFilter("Profile");

  const displayName =
    session?.code_name?.trim() ||
    session?.name?.trim() ||
    session?.email?.trim() ||
    "User";

  return (
    <>
      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
        aria-label="User mobile navigation"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/25 shadow-[0_-8px_30px_rgba(30,58,138,0.4)]">
          <GlassBackdrop horizontal />
          <div className="relative z-10 flex items-stretch justify-around gap-0.5 px-1 py-1.5 text-white">
            <NavLink to="/user-dashboard" end className={mobileNavLinkClass}>
              <HomeIcon />
              <span className="truncate">Home</span>
            </NavLink>
            <NavLink to="/user-task" className={mobileNavLinkClass}>
              <TaskIcon />
              <span className="truncate">Tasks</span>
            </NavLink>
            <NavLink to="/user-links" className={mobileNavLinkClass}>
              <LinksIcon />
              <span className="truncate">Links</span>
            </NavLink>
            <NavLink to="/user-cto" className={mobileNavLinkClass}>
              <CtoIcon />
              <span className="truncate">CTO</span>
            </NavLink>
            <NavLink to="/user-contacts" className={mobileNavLinkClass}>
              <ContactIcon />
              <span className="truncate">Contacts</span>
            </NavLink>
            <NavLink to="/user-project-timeline" className={mobileNavLinkClass}>
              <ProjectTimelineIcon />
              <span className="truncate">Timeline</span>
            </NavLink>
            <NavLink to="/user-profile" className={mobileNavLinkClass}>
              <ProfileIcon />
              <span className="truncate">Profile</span>
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside
        id="user-sidebar"
        className="relative hidden h-screen w-64 shrink-0 p-3 lg:sticky lg:top-0 lg:flex"
        aria-label="User sidebar"
      >
        <div className="absolute inset-3 overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
          <GlassBackdrop />
        </div>

        <div className="relative z-10 flex h-full w-full flex-col overflow-hidden rounded-2xl text-white">
          <div className="border-b border-white/15 px-5 py-5">
            <div className="flex items-center gap-3">
              <img
                src={DOST_LOGO_SRC}
                alt="Department of Science and Technology logo"
                className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-1 shadow-md"
              />
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100/90">
                  DOST Marinduque
                </p>
                <h1 className="truncate text-sm font-bold leading-tight">
                  PSTO Calendar
                </h1>
              </div>
            </div>
          </div>

          <div className="relative mx-4 mt-4">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full rounded-xl border border-white/15 bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder:text-sky-100/45 focus:border-sky-300/50 focus:outline-none focus:ring-1 focus:ring-sky-300/30"
              aria-label="Search navigation"
            />
          </div>

          <nav
            className="mt-3 flex flex-1 flex-col space-y-1 overflow-y-auto px-3 pb-3"
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
            {(navFilter("Links") || navFilter("Admin Links")) && (
              <NavLink to="/user-links" className={navItemClass}>
                <LinksIcon />
                <span className="truncate">Links</span>
              </NavLink>
            )}
            {navFilter("CTO") && (
              <NavLink to="/user-cto" className={navItemClass}>
                <CtoIcon />
                <span className="truncate">CTO</span>
              </NavLink>
            )}
            {(navFilter("Contacts") || navFilter("Contact")) && (
              <NavLink to="/user-contacts" className={navItemClass}>
                <ContactIcon />
                <span className="truncate">Contacts</span>
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
              <p className="mt-2 px-3 text-xs text-sky-100/50">
                No results for &ldquo;{query}&rdquo;
              </p>
            )}
          </nav>

          <div className="mx-3 mb-3 space-y-3 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              {session?.email ? (
                <p className="truncate text-xs text-sky-100/75">{session.email}</p>
              ) : (
                <p className="truncate text-xs text-sky-100/75">PSTO Calendar · User</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-sky-200/30 bg-sky-700/70 px-3 py-2 text-sm font-medium transition-all hover:bg-sky-800 hover:shadow-[0_0_15px_rgba(56,189,248,0.35)]"
            >
              <LogoutIcon />
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default UserSidebar;
