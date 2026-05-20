import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoutes from "../components/Security/ProtectedRoutes";
import { LandingPage, Login, SignUp, Dashboard, AddTask } from "../pages";

export const Routers = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        {/* Admin Page */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoutes adminOnly>
              <Dashboard />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/admin-add-task"
          element={
            <ProtectedRoutes adminOnly>
              <AddTask />
            </ProtectedRoutes>
          }
        />
      </Routes>
    </Router>
  );
};
