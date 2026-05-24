import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import ProtectedRoutes from "../components/Security/ProtectedRoutes";
import {
  // LandingPage,
  Login,
  SignUp,
  Dashboard,
  AddTask,
  AddUsers,
  UserDashboard,
  UserTask,
  AdminCalendar,
  UserProfile,
  ViewerDashboard,
  ViewerCalendar,
} from "../pages";

export const Routers = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
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
        <Route
          path="/admin-add-users"
          element={
            <ProtectedRoutes adminOnly>
              <AddUsers />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/admin-calendar"
          element={
            <ProtectedRoutes adminOnly>
              <AdminCalendar />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/admin-profile"
          element={
            <ProtectedRoutes adminOnly>
              <UserProfile />
            </ProtectedRoutes>
          }
        />

        {/* Viewer (read-only dashboard & calendar) */}
        <Route
          path="/viewer-dashboard"
          element={
            <ProtectedRoutes viewerOnly>
              <ViewerDashboard />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/viewer-calendar"
          element={
            <ProtectedRoutes viewerOnly>
              <ViewerCalendar />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/viewer-profile"
          element={
            <ProtectedRoutes viewerOnly>
              <UserProfile />
            </ProtectedRoutes>
          }
        />

        {/* User Page */}
        <Route
          path="/user-dashboard"
          element={
            <ProtectedRoutes userOnly>
              <UserDashboard />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/user-task"
          element={
            <ProtectedRoutes userOnly>
              <UserTask />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/user-profile"
          element={
            <ProtectedRoutes userOnly>
              <UserProfile />
            </ProtectedRoutes>
          }
        />
      </Routes>
    </Router>
  );
};
