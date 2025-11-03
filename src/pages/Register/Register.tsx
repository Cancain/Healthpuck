import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/Button/Button";
import styles from "./Register.module.css";
import { useAuth } from "../../auth/AuthContext";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"patient" | "caregiver">("caregiver");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): string | null => {
    if (!name.trim()) return "Namn krävs";
    if (!emailRegex.test(email)) return "Ogiltig e-post";
    if (password.length < 8) return "Lösenord måste vara minst 8 tecken";
    if (password !== confirmPassword) return "Lösenorden matchar inte";
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
      const res = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Något gick fel");
      }
      // Ensure auth context sees the new session before navigating
      await refresh();
      setSuccess(true);
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>Skapa konto</h2>

      {success && (
        <div className={styles.success} role="status">
          Konto skapat! Du omdirigeras...
        </div>
      )}

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="name">Namn</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={submitting || success}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="email">E-post</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={submitting || success}
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
            disabled={submitting || success}
            minLength={8}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="confirmPassword">Bekräfta lösenord</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={submitting || success}
            minLength={8}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="role">Jag registrerar mig som</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as "patient" | "caregiver")}
            required
            disabled={submitting || success}
          >
            <option value="caregiver">Omsorgsgivare</option>
            <option value="patient">Patient</option>
          </select>
        </div>

        <div className={styles.actions}>
          <Button type="submit">{submitting ? "Skickar..." : "Registrera"}</Button>
        </div>
      </form>
    </section>
  );
};

export default RegisterPage;
