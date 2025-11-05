import React from "react";

import styles from "./Logo.module.css";

interface LogoProps {
  size?: "small" | "medium" | "large";
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = "medium", className }) => {
  const sizeClass = styles[size];

  return (
    <div className={`${styles.logo} ${sizeClass} ${className || ""}`}>
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Health Puck logo"
        role="img"
      >
        {/* Light blue background circle */}
        <circle cx="50" cy="50" r="48" fill="#c0e8f7" />

        {/* Blue ring/wristband outer circle */}
        <circle cx="50" cy="50" r="40" fill="none" stroke="#336699" strokeWidth="6" />

        {/* White heart icon */}
        <path
          d="M 50 35 C 45 30, 35 30, 35 40 C 35 50, 50 65, 50 65 C 50 65, 65 50, 65 40 C 65 30, 55 30, 50 35 Z"
          fill="#ffffff"
        />

        {/* ECG/heartbeat line through heart */}
        <path
          d="M 30 50 L 35 50 L 36 45 L 38 55 L 40 45 L 42 55 L 44 45 L 46 50 L 50 50"
          stroke="#336699"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 50 50 L 54 50 L 56 45 L 58 55 L 60 45 L 62 55 L 64 45 L 66 50 L 70 50"
          stroke="#336699"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default Logo;
