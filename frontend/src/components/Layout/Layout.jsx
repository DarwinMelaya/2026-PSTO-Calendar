import { getSession } from "../../utils/session";
import Sidebar from "./Sidebar";
import UserSidebar from "./UserSidebar";

const Layout = ({ children }) => {
  const user = getSession();
  const isAdmin = user?.role === "admin";

  return (
    <div className="flex min-h-screen bg-slate-50">
      {isAdmin ? <Sidebar /> : <UserSidebar />}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
};

export default Layout;
