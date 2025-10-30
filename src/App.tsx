import { Routes, Route, useNavigate } from "react-router-dom";

import Header from "./components/Header/Header";
import Hero from "./components/Hero/Hero";
import styles from "./App.module.css";
import RegisterPage from "./pages/Register/Register";
import LoginPage from "./pages/Login/Login";
import DashboardPage from "./pages/Dashboard";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";

function App() {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleGetStartedClick = () => {
    navigate("/register");
  };

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
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
