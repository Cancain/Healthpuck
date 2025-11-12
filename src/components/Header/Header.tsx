import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

import Button from "../Button/Button";
import Logo from "../Logo/Logo";
import styles from "./Header.module.css";
import { useAuth } from "../../auth/AuthContext";

interface HeaderProps {
  onLoginClick?: () => void;
  onGetStartedClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLoginClick, onGetStartedClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLoginClick = () => {
    setIsMenuOpen(false);
    onLoginClick?.();
  };

  const handleGetStartedClick = () => {
    setIsMenuOpen(false);
    onGetStartedClick?.();
  };

  const handleLogoutClick = async () => {
    setIsMenuOpen(false);
    await logout();
  };

  const handleSettingsClick = () => {
    setIsMenuOpen(false);
    navigate("/settings");
  };

  const handleLogoClick = () => {
    setIsMenuOpen(false);
    navigate("/");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.logoSection} onClick={handleLogoClick}>
          <Logo size="small" className={styles.logo} />
          <h1 className={styles.title}>Healthpuck</h1>
        </div>
        <nav className={styles.navigation} ref={menuRef}>
          <div className={styles.desktopButtons}>
            {user ? (
              <>
                <Link className={styles.userLink} to="/settings">
                  {user.name}
                </Link>
                <Button variant="secondary" onClick={handleSettingsClick}>
                  Inställningar
                </Button>
                <Button variant="secondary" onClick={handleLogoutClick}>
                  Logga ut
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={onLoginClick}>
                  Logga in
                </Button>
                <Button variant="primary" onClick={onGetStartedClick}>
                  Skaffa nu!
                </Button>
              </>
            )}
          </div>
          <button
            className={styles.hamburger}
            onClick={handleMenuToggle}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
          </button>
          {isMenuOpen && (
            <div className={styles.dropdown}>
              {user ? (
                <>
                  <Link className={styles.userLink} to="/settings">
                    {user.name}
                  </Link>
                  <Button variant="secondary" onClick={handleSettingsClick}>
                    Inställningar
                  </Button>
                  <Button variant="secondary" onClick={handleLogoutClick}>
                    Logga ut
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" onClick={handleLoginClick}>
                    Logga in
                  </Button>
                  <Button variant="primary" onClick={handleGetStartedClick}>
                    Skaffa nu!
                  </Button>
                </>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
