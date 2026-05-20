import { getSession } from "../../utils/session";

const UserNavbar = () => {
  const user = getSession();
  const displayName = user?.name || user?.code_name || user?.email || "User";

  return (
    <header className="border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">Welcome back</p>
        <p className="text-sm font-semibold text-slate-900">{displayName}</p>
      </div>
    </header>
  );
};

export default UserNavbar;
