import Header from "./components/Header/Header";
import Hero from "./components/Hero/Hero";
import styles from "./App.module.css";

function App() {
  const handleLoginClick = () => {
    console.log("Login clicked");
  };

  const handleGetStartedClick = () => {
    console.log("Get started clicked");
  };

  return (
    <div className={styles.app}>
      <Header
        onLoginClick={handleLoginClick}
        onGetStartedClick={handleGetStartedClick}
      />
      <Hero />
    </div>
  );
}

export default App;
