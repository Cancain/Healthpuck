import styles from "./Hero.module.css";

const Hero: React.FC = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <h2 className={styles.heroTitle}>Välkommen till Healthpuck</h2>
        <p className={styles.heroSubtitle}>Omsorg som aldrig släpper taget</p>
      </div>
    </section>
  );
};

export default Hero;
