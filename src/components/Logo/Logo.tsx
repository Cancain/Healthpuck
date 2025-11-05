import React from "react";

import styles from "./Logo.module.css";

interface LogoProps {
  size?: "small" | "medium" | "large";
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = "medium", className }) => {
  const sizeClass = styles[size];
  const logoPath = process.env.PUBLIC_URL
    ? `${process.env.PUBLIC_URL}/images/logo/HPlogo.png`
    : "/images/logo/HPlogo.png";

  return (
    <div className={`${styles.logo} ${sizeClass} ${className || ""}`}>
      <img
        src={logoPath}
        alt=""
        className={styles.logoImage}
        onError={(e) => {
          console.error("Failed to load logo image from:", logoPath);
          console.error("PUBLIC_URL:", process.env.PUBLIC_URL);
          console.error("Trying alternative path...");
          // Try alternative path as fallback
          (e.target as HTMLImageElement).src = "/images/logo/HPlogo.png";
        }}
      />
    </div>
  );
};

export default Logo;
