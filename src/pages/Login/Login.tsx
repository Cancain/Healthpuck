import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import Button from "../../components/Button/Button";
import styles from "./Login.module.css";
import { useAuth } from "../../auth/AuthContext";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): string | null => {
    if (!emailRegex.test(email)) return "Ogiltig e-post";
    if (!password) return "Lösenord krävs";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Felaktiga uppgifter");
      }
      // Ensure auth context sees the new session before navigating
      await refresh();
      const from = (location.state as any)?.from?.pathname || "/home";
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>Logga in</h2>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="email">E-post</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={submitting}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="password">Lösenord</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={submitting}
          />
        </div>

        <div className={styles.actions}>
          <Button type="submit">{submitting ? "Loggar in..." : "Logga in"}</Button>
        </div>
      </form>
    </section>
  );
};

export default LoginPage;
