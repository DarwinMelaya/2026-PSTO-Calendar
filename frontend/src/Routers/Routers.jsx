import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LandingPage, Login, SignUp, Dashboard } from "../pages";

export const Routers = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        {/* Admin Page */}
        <Route path="/admin-dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
};
