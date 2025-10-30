import { Routes, Route, useNavigate } from "react-router-dom";

import Header from "./components/Header/Header";
import Hero from "./components/Hero/Hero";
import styles from "./App.module.css";
import RegisterPage from "./pages/Register/Register";

function App() {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    console.log("Login clicked");
  };

  const handleGetStartedClick = () => {
    navigate("/register");
  };

  return (
    <div className={styles.app}>
      <Header onLoginClick={handleLoginClick} onGetStartedClick={handleGetStartedClick} />
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </div>
  );
}

export default App;
