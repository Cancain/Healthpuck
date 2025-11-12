import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";

import Header from "./components/Header/Header";
import Hero from "./components/Hero/Hero";
import styles from "./App.module.css";
import RegisterPage from "./pages/Register/Register";
import LoginPage from "./pages/Login/Login";
import DashboardPage from "./pages/Dashboard";
import SettingsPage from "./pages/Settings/Settings";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleGetStartedClick = () => {
    navigate("/register");
  };

  useEffect(() => {
    const navigateToSettings = (query: string) => {
      if (location.pathname !== "/settings") {
        navigate(`/settings${query}`, { replace: true });
      }
    };

    const hash = window.location.hash;
    if (hash.startsWith("#/settings")) {
      const questionMarkIndex = hash.indexOf("?");
      const query = questionMarkIndex !== -1 ? hash.substring(questionMarkIndex) : "";
      navigateToSettings(query);
      return;
    }

    if (location.search.includes("tab=")) {
      navigateToSettings(location.search);
    }
  }, [location.pathname, location.search, navigate]);

  return (
    <AuthProvider>
      <div className={styles.app}>
        <Header onLoginClick={handleLoginClick} onGetStartedClick={handleGetStartedClick} />
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
