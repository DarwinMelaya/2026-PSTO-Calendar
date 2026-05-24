import { Navigate } from "react-router-dom";
import { getHomePathForRole } from "../../utils/profile";
import { getSession } from "../../utils/session";

const ProtectedRoutes = ({
  children,
  adminOnly = false,
  userOnly = false,
  viewerOnly = false,
}) => {
  const user = getSession();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Navigate to={getHomePathForRole(user.role)} replace />;
  }

  if (viewerOnly && user.role !== "viewer") {
    return <Navigate to={getHomePathForRole(user.role)} replace />;
  }

  if (userOnly && user.role !== "user") {
    return <Navigate to={getHomePathForRole(user.role)} replace />;
  }

  return children;
};

export default ProtectedRoutes;
