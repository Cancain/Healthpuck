import styles from "./Button.module.css";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  tooltip?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled = false,
  tooltip,
}) => {
  return (
    <div className={styles.buttonWrapper}>
      <button
        disabled={disabled}
        className={`${styles.button} ${styles[variant]} ${disabled ? styles.disabled : ""}`}
        onClick={onClick}
        type={type}
        title={tooltip}
      >
        {children}
      </button>
      {tooltip && (
        <span className={styles.tooltip} role="tooltip">
          {tooltip}
        </span>
      )}
    </div>
  );
};

export default Button;
