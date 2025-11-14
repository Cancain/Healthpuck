import styles from "./Button.module.css";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled = false,
}) => {
  return (
    <button
      disabled={disabled}
      className={`${styles.button} ${styles[variant]} ${disabled ? styles.disabled : ""}`}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
};

export default Button;
