import { isAdminRole, isViewerRole } from "../../utils/profile";
import { getSession } from "../../utils/session";
import Sidebar from "./Sidebar";
import UserNavbar from "./UserNavbar";
import UserSidebar from "./UserSidebar";
import ViewerSidebar from "./ViewerSidebar";

const Layout = ({ children }) => {
  const user = getSession();
  const isAdmin = isAdminRole(user?.role);
  const isViewer = isViewerRole(user?.role);

  const sidebar = isAdmin ? (
    <Sidebar />
  ) : isViewer ? (
    <ViewerSidebar />
  ) : (
    <UserSidebar />
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:flex lg:items-start">
      {sidebar}
      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
        {!isAdmin ? <UserNavbar /> : null}
        <main className="min-w-0 flex-1 p-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
