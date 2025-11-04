import React, { useState, useEffect } from "react";

import Button from "../../components/Button/Button";
import styles from "./Settings.module.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Patient {
  id: number;
  name: string;
  email: string | null;
  role: string;
}

interface PatientUser {
  userId: number;
  email: string;
  name: string;
  role: string;
  invitedAt: string;
  acceptedAt: string | null;
}

const SettingsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientUsers, setPatientUsers] = useState<Record<number, PatientUser[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState<Record<number, string>>({});
  const [inviting, setInviting] = useState<Record<number, boolean>>({});
  const [deletingPatient, setDeletingPatient] = useState<Record<number, boolean>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<Record<number, string | null>>({});
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientEmail, setNewPatientEmail] = useState("");
  const [newPatientPassword, setNewPatientPassword] = useState("");
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [createPatientError, setCreatePatientError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/patients`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Kunde inte hämta omsorgstagare");
      }
      const data = await res.json();
      setPatients(data);

      for (const patient of data) {
        await fetchPatientUsers(patient.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientUsers = async (patientId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/patients/${patientId}/users`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Kunde inte hämta användare");
      }
      const data = await res.json();
      setPatientUsers((prev) => ({ ...prev, [patientId]: data }));
    } catch (err) {
      console.error("Error fetching patient users:", err);
    }
  };

  const handleInvite = async (patientId: number, role: "patient" | "caregiver") => {
    const email = inviteEmail[patientId]?.trim();

    if (!email) {
      setInviteError((prev) => ({ ...prev, [patientId]: "E-post krävs" }));
      return;
    }

    if (!emailRegex.test(email)) {
      setInviteError((prev) => ({ ...prev, [patientId]: "Ogiltig e-post" }));
      return;
    }

    setInviteError((prev) => ({ ...prev, [patientId]: null }));
    setInviting((prev) => ({ ...prev, [patientId]: true }));

    try {
      const res = await fetch(`${API_BASE}/api/patients/${patientId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Användaren finns inte. Användaren måste ha ett konto.");
        }
        if (res.status === 409) {
          throw new Error("Användaren har redan tillgång till denna omsorgstagare");
        }
        throw new Error(data.error || "Kunde inte bjuda in användare");
      }

      setSuccessMessage("Användare inbjuden!");
      setInviteEmail((prev) => ({ ...prev, [patientId]: "" }));
      await fetchPatientUsers(patientId);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setInviteError((prev) => ({
        ...prev,
        [patientId]: err instanceof Error ? err.message : "Något gick fel",
      }));
    } finally {
      setInviting((prev) => ({ ...prev, [patientId]: false }));
    }
  };

  const handleDeletePatient = async (patientId: number, patientName: string) => {
    if (
      !window.confirm(
        `Är du säker på att du vill ta bort ${patientName}? Detta kommer att ta bort alla data kopplade till denna omsorgstagare.`,
      )
    ) {
      return;
    }

    setDeletingPatient((prev) => ({ ...prev, [patientId]: true }));

    try {
      const res = await fetch(`${API_BASE}/api/patients/${patientId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Kunde inte ta bort omsorgstagare");
      }

      setSuccessMessage("Omsorgstagare borttagen!");
      await fetchPatients();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setDeletingPatient((prev) => ({ ...prev, [patientId]: false }));
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatePatientError(null);

    if (!newPatientName.trim()) {
      setCreatePatientError("Namn krävs");
      return;
    }

    if (!newPatientEmail.trim()) {
      setCreatePatientError("E-post krävs");
      return;
    }

    if (!emailRegex.test(newPatientEmail)) {
      setCreatePatientError("Ogiltig e-post");
      return;
    }

    if (!newPatientPassword || newPatientPassword.length < 8) {
      setCreatePatientError("Lösenord måste vara minst 8 tecken");
      return;
    }

    setCreatingPatient(true);

    try {
      const res = await fetch(`${API_BASE}/api/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newPatientName.trim(),
          email: newPatientEmail.trim(),
          password: newPatientPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Kunde inte skapa omsorgstagare");
      }

      setSuccessMessage("Omsorgstagare skapad!");
      setNewPatientName("");
      setNewPatientEmail("");
      setNewPatientPassword("");
      setShowCreatePatient(false);
      await fetchPatients();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setCreatePatientError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setCreatingPatient(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <p>Laddar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Inställningar</h1>

      {successMessage && <div className={styles.success}>{successMessage}</div>}

      {patients.length === 0 && (
        <div className={styles.createPatientSection}>
          {!showCreatePatient ? (
            <Button onClick={() => setShowCreatePatient(true)}>Lägg till omsorgstagare</Button>
          ) : (
            <form onSubmit={handleCreatePatient} className={styles.createPatientForm}>
              <h3 className={styles.sectionTitle}>Lägg till ny omsorgstagare</h3>
              <div className={styles.field}>
                <label htmlFor="newPatientName">Namn *</label>
                <input
                  id="newPatientName"
                  type="text"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  required
                  disabled={creatingPatient}
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="newPatientEmail">E-post *</label>
                <input
                  id="newPatientEmail"
                  type="email"
                  value={newPatientEmail}
                  onChange={(e) => setNewPatientEmail(e.target.value)}
                  required
                  disabled={creatingPatient}
                  className={styles.input}
                  placeholder="E-post för inloggning"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="newPatientPassword">Lösenord *</label>
                <input
                  id="newPatientPassword"
                  type="password"
                  value={newPatientPassword}
                  onChange={(e) => setNewPatientPassword(e.target.value)}
                  required
                  disabled={creatingPatient}
                  className={styles.input}
                  placeholder="Minst 8 tecken"
                  minLength={8}
                />
              </div>
              {createPatientError && <div className={styles.error}>{createPatientError}</div>}
              <div className={styles.formActions}>
                <Button type="submit" disabled={creatingPatient}>
                  {creatingPatient ? "Skapar..." : "Skapa"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCreatePatient(false);
                    setNewPatientName("");
                    setNewPatientEmail("");
                    setNewPatientPassword("");
                    setCreatePatientError(null);
                  }}
                  disabled={creatingPatient}
                >
                  Avbryt
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {patients.length === 0 ? (
        <p className={styles.empty}>Du har inga omsorgstagare ännu.</p>
      ) : (
        <div className={styles.patientsList}>
          {patients.map((patient) => {
            const users = patientUsers[patient.id] || [];
            const isInviting = inviting[patient.id] || false;

            return (
              <div key={patient.id} className={styles.patientCard}>
                <div className={styles.patientHeader}>
                  <div>
                    <h2 className={styles.patientName}>{patient.name}</h2>
                    {patient.email && <p className={styles.patientEmail}>{patient.email}</p>}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => handleDeletePatient(patient.id, patient.name)}
                    disabled={deletingPatient[patient.id] || false}
                  >
                    {deletingPatient[patient.id] ? "Tar bort..." : "Ta bort"}
                  </Button>
                </div>

                <div className={styles.caregiversSection}>
                  <h3 className={styles.sectionTitle}>Användare</h3>
                  {users.length === 0 ? (
                    <p className={styles.emptyList}>Inga användare ännu</p>
                  ) : (
                    <ul className={styles.caregiversList}>
                      {users.map((user) => {
                        return (
                          <li key={user.userId} className={styles.caregiverItem}>
                            <div className={styles.caregiverInfo}>
                              <span className={styles.caregiverName}>{user.name}</span>
                              <span className={styles.caregiverEmail}>{user.email}</span>
                              <span className={styles.caregiverRole}>
                                {user.role === "patient" ? "Omsorgstagare" : "Omsorgsgivare"}
                              </span>
                            </div>
                            <Button
                              variant="secondary"
                              onClick={() => handleDeletePatient(patient.id, patient.name)}
                              disabled={deletingPatient[patient.id] || false}
                            >
                              {deletingPatient[patient.id] ? "Tar bort..." : "Ta bort"}
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className={styles.inviteSection}>
                  <h3 className={styles.sectionTitle}>Bjud in omsorgsgivare</h3>
                  <p className={styles.inviteDescription}>
                    Bjud in en befintlig användare som omsorgsgivare. Användaren måste ha ett konto.
                  </p>
                  <form
                    className={styles.inviteForm}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const formData = new FormData(form);
                      const role = (formData.get("role") as "patient" | "caregiver") || "caregiver";
                      handleInvite(patient.id, role);
                    }}
                  >
                    <input
                      type="email"
                      name="email"
                      placeholder="E-postadress"
                      value={inviteEmail[patient.id] || ""}
                      onChange={(e) =>
                        setInviteEmail((prev) => ({ ...prev, [patient.id]: e.target.value }))
                      }
                      className={styles.inviteInput}
                      disabled={isInviting}
                      required
                    />

                    <Button type="submit" disabled={isInviting}>
                      {isInviting ? "Bjuder in..." : "Bjud in"}
                    </Button>
                  </form>
                  {inviteError[patient.id] && (
                    <div className={styles.error}>{inviteError[patient.id]}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
