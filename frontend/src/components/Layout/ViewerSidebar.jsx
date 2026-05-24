import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { clearSession } from "../../utils/session";

const iconClass = "h-5 w-5 shrink-0";

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

const DOST_LOGO_SRC = "/Assets/dostlogo.png";

const panelLinkClass = ({ isActive }) =>
  `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
    isActive
      ? "bg-slate-600/70 text-white"
      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
  }`;

const mobileNavLinkClass = ({ isActive }) =>
  `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors sm:text-xs ${
    isActive ? "text-white" : "text-slate-400 active:text-slate-200"
  }`;

const ViewerSidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    toast.success("Logged out successfully.");
    navigate("/", { replace: true });
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-800/80 bg-[#0f172a] px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_24px_rgba(0,0,0,0.15)] lg:hidden"
        aria-label="Viewer mobile navigation"
      >
        <NavLink to="/viewer-dashboard" end className={mobileNavLinkClass}>
          <HomeIcon />
          <span className="truncate">Dashboard</span>
        </NavLink>
        <NavLink to="/viewer-calendar" className={mobileNavLinkClass}>
          <CalendarIcon />
          <span className="truncate">Calendar</span>
        </NavLink>
      </nav>

      <aside
        id="viewer-sidebar"
        className="hidden min-h-screen w-64 shrink-0 flex-col bg-[#0f172a] px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto"
        aria-label="Viewer sidebar"
      >
        <div className="flex items-center gap-3">
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
              PSTO Calendar · View only
            </p>
          </div>
        </div>

        <nav
          className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto pb-4"
          aria-label="Viewer navigation"
        >
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Overview
          </p>
          <NavLink to="/viewer-dashboard" end className={panelLinkClass}>
            <HomeIcon />
            Dashboard
          </NavLink>
          <NavLink to="/viewer-calendar" className={panelLinkClass}>
            <CalendarIcon />
            Calendar
          </NavLink>
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
            PSTO Calendar · Viewer
          </p>
        </div>
      </aside>
    </>
  );
};

export default ViewerSidebar;
