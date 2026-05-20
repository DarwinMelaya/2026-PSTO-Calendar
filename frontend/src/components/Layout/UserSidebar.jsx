import { NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { clearSession } from "../../utils/session";

const navLinkClass = ({ isActive }) =>
  `block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
    isActive ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
  }`;

const UserSidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    toast.success("Logged out successfully.");
    navigate("/login", { replace: true });
  };

  return (
    <aside className="flex min-h-screen w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-5">
        <h2 className="text-lg font-semibold text-slate-900">PSTO Calendar</h2>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        <NavLink to="/user-dashboard" className={navLinkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/user-task" className={navLinkClass}>
          My Tasks
        </NavLink>
      </nav>
      <div className="mt-auto border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          Log out
        </button>
      </div>
    </aside>
  );
};

export default UserSidebar;
