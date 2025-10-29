import React from "react";
import styles from "./Hero.module.css";

const Hero: React.FC = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <h2 className={styles.heroTitle}>Välkommen till Healthpuck</h2>
        <p className={styles.heroSubtitle}>
          Din hälsopartner för ett bättre liv
        </p>
      </div>
    </section>
  );
};

export default Hero;
