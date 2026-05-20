import { NavLink } from "react-router-dom";

const navLinkClass = ({ isActive }) =>
  `block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
    isActive ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
  }`;

const Sidebar = () => {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-5">
        <h2 className="text-lg font-semibold text-slate-900">PSTO Calendar</h2>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        <NavLink to="/admin-dashboard" className={navLinkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/admin-add-task" className={navLinkClass}>
          Add Task
        </NavLink>
        <NavLink to="/admin-add-users" className={navLinkClass}>
          Add Users
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
