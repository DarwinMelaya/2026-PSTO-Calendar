import { Navigate } from "react-router-dom";
import { getSession } from "../../utils/session";

const ProtectedRoutes = ({ children, adminOnly = false }) => {
  const user = getSession();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoutes;
