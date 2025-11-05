import styles from "./Hero.module.css";

const Hero: React.FC = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.heroOverlay}></div>
      <div className={styles.heroContent}>
        <h1 className={styles.heroPrimaryTitle}>Välj tryggheten</h1>
        <h2 className={styles.heroSecondaryTitle}>Välj Health Puck omsorg</h2>
        <p className={styles.heroSubtitle}>Omsorg som aldrig släpper taget</p>
      </div>
    </section>
  );
};

export default Hero;
