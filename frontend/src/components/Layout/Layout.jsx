import { getSession } from "../../utils/session";
import Sidebar from "./Sidebar";
import UserNavbar from "./UserNavbar";
import UserSidebar from "./UserSidebar";

const Layout = ({ children }) => {
  const user = getSession();
  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-slate-50 lg:flex lg:items-start">
      {isAdmin ? <Sidebar /> : <UserSidebar />}
      <div className="flex min-h-screen w-full flex-1 flex-col">
        {!isAdmin ? (
          <div className="hidden lg:block">
            <UserNavbar />
          </div>
        ) : null}
        <main className="flex-1 p-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
