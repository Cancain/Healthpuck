import { Routes, Route, Navigate } from "react-router-dom";

import Header from "./components/Header/Header";
import Hero from "./components/Hero/Hero";
import styles from "./App.module.css";
import RegisterPage from "./pages/Register/Register";
import LoginPage from "./pages/Login/Login";
import DashboardPage from "./pages/Dashboard";
import SettingsPage from "./pages/Settings/Settings";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";

function NotFound() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>404 - Sidan hittades inte</h1>
      <p>Sidan du söker finns inte.</p>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className={styles.app}>
        <Header />
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
                <Navigate to="/settings/alerts" replace />
              </RequireAuth>
            }
          />
          <Route
            path="/settings/:tab"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
