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
  ProjectTimeline,
  AllProjectsMonitoring,
  Cest,
  Setup,
  GIA,
  Sscp,
  AddCto,
  AdminLinks,
  UserLinks,
  UserCto,
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
        <Route
          path="/admin-project-timeline"
          element={
            <ProtectedRoutes adminOnly>
              <ProjectTimeline />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/admin-all-projects-monitoring"
          element={
            <ProtectedRoutes adminOnly>
              <AllProjectsMonitoring />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/admin-cest"
          element={
            <ProtectedRoutes adminOnly>
              <Cest />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/admin-setup"
          element={
            <ProtectedRoutes adminOnly>
              <Setup />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/admin-gia"
          element={
            <ProtectedRoutes adminOnly>
              <GIA />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/admin-sscp"
          element={
            <ProtectedRoutes adminOnly>
              <Sscp />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/admin-add-cto"
          element={
            <ProtectedRoutes adminOnly>
              <AddCto />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/admin-links"
          element={
            <ProtectedRoutes adminOnly>
              <AdminLinks />
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
        <Route
          path="/user-project-timeline"
          element={
            <ProtectedRoutes userOnly>
              <ProjectTimeline />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/user-links"
          element={
            <ProtectedRoutes userOnly>
              <UserLinks />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/user-cto"
          element={
            <ProtectedRoutes userOnly>
              <UserCto />
            </ProtectedRoutes>
          }
        />
      </Routes>
    </Router>
  );
};
