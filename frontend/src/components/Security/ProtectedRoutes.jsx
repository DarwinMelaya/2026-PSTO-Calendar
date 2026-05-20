import { Navigate } from "react-router-dom";
import { getSession } from "../../utils/session";

const ProtectedRoutes = ({
  children,
  adminOnly = false,
  userOnly = false,
}) => {
  const user = getSession();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/user-dashboard" replace />;
  }

  if (userOnly && user.role === "admin") {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return children;
};

export default ProtectedRoutes;
