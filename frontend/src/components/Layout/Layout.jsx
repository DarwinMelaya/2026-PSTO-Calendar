import { getSession } from "../../utils/session";
import Sidebar from "./Sidebar";
import UserNavbar from "./UserNavbar";
import UserSidebar from "./UserSidebar";

const Layout = ({ children }) => {
  const user = getSession();
  const isAdmin = user?.role === "admin";

  return (
    <div className="flex min-h-screen bg-slate-50">
      {isAdmin ? <Sidebar /> : <UserSidebar />}
      <div className="flex min-h-screen flex-1 flex-col">
        {!isAdmin && <UserNavbar />}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
