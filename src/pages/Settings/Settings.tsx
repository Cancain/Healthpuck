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

interface Medication {
  id: number;
  patientId: number;
  name: string;
  dosage: string;
  frequency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"users" | "medications">("users");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientUsers, setPatientUsers] = useState<Record<number, PatientUser[]>>({});
  const [medications, setMedications] = useState<Record<number, Medication[]>>({});
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
  const [newPatientConfirmPassword, setNewPatientConfirmPassword] = useState("");
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [createPatientError, setCreatePatientError] = useState<string | null>(null);

  // Medication form state
  const [showAddMedication, setShowAddMedication] = useState<Record<number, boolean>>({});
  const [editingMedication, setEditingMedication] = useState<number | null>(null);
  const [medicationFormData, setMedicationFormData] = useState<{
    patientId: number | null;
    name: string;
    dosage: string;
    frequency: string;
    notes: string;
  }>({
    patientId: null,
    name: "",
    dosage: "",
    frequency: "",
    notes: "",
  });
  const [medicationError, setMedicationError] = useState<Record<number, string | null>>({});
  const [deletingMedication, setDeletingMedication] = useState<Record<number, boolean>>({});
  const [savingMedication, setSavingMedication] = useState<Record<number, boolean>>({});

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
        await fetchMedications(patient.id);
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

  const fetchMedications = async (patientId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/medications/patient/${patientId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Kunde inte hämta mediciner");
      }
      const data = await res.json();
      setMedications((prev) => ({ ...prev, [patientId]: data }));
    } catch (err) {
      console.error("Error fetching medications:", err);
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

    if (newPatientPassword !== newPatientConfirmPassword) {
      setCreatePatientError("Lösenorden matchar inte");
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
      setNewPatientConfirmPassword("");
      setShowCreatePatient(false);
      await fetchPatients();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setCreatePatientError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setCreatingPatient(false);
    }
  };

  const handleCreateMedication = async (patientId: number, e: React.FormEvent) => {
    e.preventDefault();
    setMedicationError((prev) => ({ ...prev, [patientId]: null }));

    if (!medicationFormData.name.trim()) {
      setMedicationError((prev) => ({ ...prev, [patientId]: "Namn krävs" }));
      return;
    }

    if (!medicationFormData.dosage.trim()) {
      setMedicationError((prev) => ({ ...prev, [patientId]: "Dosering krävs" }));
      return;
    }

    if (!medicationFormData.frequency.trim()) {
      setMedicationError((prev) => ({ ...prev, [patientId]: "Frekvens krävs" }));
      return;
    }

    setSavingMedication((prev) => ({ ...prev, [patientId]: true }));

    try {
      const res = await fetch(`${API_BASE}/api/medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId,
          name: medicationFormData.name.trim(),
          dosage: medicationFormData.dosage.trim(),
          frequency: medicationFormData.frequency.trim(),
          notes: medicationFormData.notes.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Kunde inte skapa medicin");
      }

      setSuccessMessage("Medicin tillagd!");
      setMedicationFormData({
        patientId: null,
        name: "",
        dosage: "",
        frequency: "",
        notes: "",
      });
      setShowAddMedication((prev) => ({ ...prev, [patientId]: false }));
      await fetchMedications(patientId);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setMedicationError((prev) => ({
        ...prev,
        [patientId]: err instanceof Error ? err.message : "Något gick fel",
      }));
    } finally {
      setSavingMedication((prev) => ({ ...prev, [patientId]: false }));
    }
  };

  const handleUpdateMedication = async (
    medicationId: number,
    patientId: number,
    e: React.FormEvent,
  ) => {
    e.preventDefault();
    setMedicationError((prev) => ({ ...prev, [patientId]: null }));

    if (!medicationFormData.name.trim()) {
      setMedicationError((prev) => ({ ...prev, [patientId]: "Namn krävs" }));
      return;
    }

    if (!medicationFormData.dosage.trim()) {
      setMedicationError((prev) => ({ ...prev, [patientId]: "Dosering krävs" }));
      return;
    }

    if (!medicationFormData.frequency.trim()) {
      setMedicationError((prev) => ({ ...prev, [patientId]: "Frekvens krävs" }));
      return;
    }

    setSavingMedication((prev) => ({ ...prev, [patientId]: true }));

    try {
      const res = await fetch(`${API_BASE}/api/medications/${medicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: medicationFormData.name.trim(),
          dosage: medicationFormData.dosage.trim(),
          frequency: medicationFormData.frequency.trim(),
          notes: medicationFormData.notes.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Kunde inte uppdatera medicin");
      }

      setSuccessMessage("Medicin uppdaterad!");
      setEditingMedication(null);
      setMedicationFormData({
        patientId: null,
        name: "",
        dosage: "",
        frequency: "",
        notes: "",
      });
      await fetchMedications(patientId);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setMedicationError((prev) => ({
        ...prev,
        [patientId]: err instanceof Error ? err.message : "Något gick fel",
      }));
    } finally {
      setSavingMedication((prev) => ({ ...prev, [patientId]: false }));
    }
  };

  const handleDeleteMedication = async (
    medicationId: number,
    patientId: number,
    medicationName: string,
  ) => {
    if (!window.confirm(`Är du säker på att du vill ta bort ${medicationName}?`)) {
      return;
    }

    setDeletingMedication((prev) => ({ ...prev, [medicationId]: true }));

    try {
      const res = await fetch(`${API_BASE}/api/medications/${medicationId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Kunde inte ta bort medicin");
      }

      setSuccessMessage("Medicin borttagen!");
      await fetchMedications(patientId);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setDeletingMedication((prev) => ({ ...prev, [medicationId]: false }));
    }
  };

  const startEditMedication = (medication: Medication) => {
    setEditingMedication(medication.id);
    setMedicationFormData({
      patientId: medication.patientId,
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      notes: medication.notes || "",
    });
    setMedicationError((prev) => ({ ...prev, [medication.patientId]: null }));
  };

  const cancelEditMedication = () => {
    setEditingMedication(null);
    setMedicationFormData({
      patientId: null,
      name: "",
      dosage: "",
      frequency: "",
      notes: "",
    });
  };

  const startAddMedication = (patientId: number) => {
    setShowAddMedication((prev) => ({ ...prev, [patientId]: true }));
    setMedicationFormData({
      patientId,
      name: "",
      dosage: "",
      frequency: "",
      notes: "",
    });
    setMedicationError((prev) => ({ ...prev, [patientId]: null }));
  };

  const cancelAddMedication = (patientId: number) => {
    setShowAddMedication((prev) => ({ ...prev, [patientId]: false }));
    setMedicationFormData({
      patientId: null,
      name: "",
      dosage: "",
      frequency: "",
      notes: "",
    });
    setMedicationError((prev) => ({ ...prev, [patientId]: null }));
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

      <div className={styles.tabs}>
        <button
          className={activeTab === "users" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("users")}
        >
          Användare
        </button>
        <button
          className={activeTab === "medications" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("medications")}
        >
          Mediciner
        </button>
      </div>

      {successMessage && <div className={styles.success}>{successMessage}</div>}

      <div className={styles.tabContent}>
        {activeTab === "users" && (
          <>
            {patients.length === 0 && (
              <div className={styles.createPatientSection}>
                {!showCreatePatient ? (
                  <Button onClick={() => setShowCreatePatient(true)}>
                    Lägg till omsorgstagare
                  </Button>
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
                    <div className={styles.field}>
                      <label htmlFor="newPatientConfirmPassword">Bekräfta lösenord *</label>
                      <input
                        id="newPatientConfirmPassword"
                        type="password"
                        value={newPatientConfirmPassword}
                        onChange={(e) => setNewPatientConfirmPassword(e.target.value)}
                        required
                        disabled={creatingPatient}
                        className={styles.input}
                        placeholder="Bekräfta lösenord"
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
                          setNewPatientConfirmPassword("");
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
                          Bjud in en befintlig användare som omsorgsgivare. Användaren måste ha ett
                          konto.
                        </p>
                        <form
                          className={styles.inviteForm}
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const formData = new FormData(form);
                            const role =
                              (formData.get("role") as "patient" | "caregiver") || "caregiver";
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
          </>
        )}

        {activeTab === "medications" && (
          <>
            {patients.length === 0 ? (
              <p className={styles.empty}>Du har inga omsorgstagare ännu.</p>
            ) : (
              <div className={styles.patientsList}>
                {patients.map((patient) => {
                  const patientMedications = medications[patient.id] || [];
                  const isSaving = savingMedication[patient.id] || false;
                  const isAdding = showAddMedication[patient.id] || false;

                  return (
                    <div key={patient.id} className={styles.patientCard}>
                      <div className={styles.patientHeader}>
                        <div>
                          <h2 className={styles.patientName}>{patient.name}</h2>
                          {patient.email && <p className={styles.patientEmail}>{patient.email}</p>}
                        </div>
                      </div>

                      <div className={styles.medicationsSection}>
                        <h3 className={styles.sectionTitle}>Mediciner</h3>
                        {patientMedications.length === 0 && !isAdding ? (
                          <p className={styles.emptyList}>Inga mediciner ännu</p>
                        ) : (
                          <ul className={styles.medicationsList}>
                            {patientMedications.map((medication) => {
                              if (editingMedication === medication.id) {
                                return (
                                  <li key={medication.id} className={styles.medicationItem}>
                                    <form
                                      onSubmit={(e) =>
                                        handleUpdateMedication(
                                          medication.id,
                                          medication.patientId,
                                          e,
                                        )
                                      }
                                      className={styles.medicationForm}
                                    >
                                      <div className={styles.field}>
                                        <label htmlFor={`edit-med-name-${medication.id}`}>
                                          Namn *
                                        </label>
                                        <input
                                          id={`edit-med-name-${medication.id}`}
                                          type="text"
                                          value={medicationFormData.name}
                                          onChange={(e) =>
                                            setMedicationFormData((prev) => ({
                                              ...prev,
                                              name: e.target.value,
                                            }))
                                          }
                                          required
                                          disabled={isSaving}
                                          className={styles.input}
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label htmlFor={`edit-med-dosage-${medication.id}`}>
                                          Dosering *
                                        </label>
                                        <input
                                          id={`edit-med-dosage-${medication.id}`}
                                          type="text"
                                          value={medicationFormData.dosage}
                                          onChange={(e) =>
                                            setMedicationFormData((prev) => ({
                                              ...prev,
                                              dosage: e.target.value,
                                            }))
                                          }
                                          required
                                          disabled={isSaving}
                                          className={styles.input}
                                          placeholder="t.ex. 500mg"
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label htmlFor={`edit-med-frequency-${medication.id}`}>
                                          Frekvens *
                                        </label>
                                        <input
                                          id={`edit-med-frequency-${medication.id}`}
                                          type="text"
                                          value={medicationFormData.frequency}
                                          onChange={(e) =>
                                            setMedicationFormData((prev) => ({
                                              ...prev,
                                              frequency: e.target.value,
                                            }))
                                          }
                                          required
                                          disabled={isSaving}
                                          className={styles.input}
                                          placeholder="t.ex. 2 gånger per dag"
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label htmlFor={`edit-med-notes-${medication.id}`}>
                                          Anteckningar
                                        </label>
                                        <textarea
                                          id={`edit-med-notes-${medication.id}`}
                                          value={medicationFormData.notes}
                                          onChange={(e) =>
                                            setMedicationFormData((prev) => ({
                                              ...prev,
                                              notes: e.target.value,
                                            }))
                                          }
                                          disabled={isSaving}
                                          className={styles.textarea}
                                          rows={3}
                                        />
                                      </div>
                                      {medicationError[medication.patientId] && (
                                        <div className={styles.error}>
                                          {medicationError[medication.patientId]}
                                        </div>
                                      )}
                                      <div className={styles.formActions}>
                                        <Button type="submit" disabled={isSaving}>
                                          {isSaving ? "Sparar..." : "Spara"}
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          onClick={cancelEditMedication}
                                          disabled={isSaving}
                                        >
                                          Avbryt
                                        </Button>
                                      </div>
                                    </form>
                                  </li>
                                );
                              }

                              return (
                                <li key={medication.id} className={styles.medicationItem}>
                                  <div className={styles.medicationInfo}>
                                    <span className={styles.medicationName}>{medication.name}</span>
                                    <span className={styles.medicationDetails}>
                                      {medication.dosage} • {medication.frequency}
                                    </span>
                                    {medication.notes && (
                                      <span className={styles.medicationNotes}>
                                        {medication.notes}
                                      </span>
                                    )}
                                  </div>
                                  <div className={styles.medicationActions}>
                                    <Button
                                      variant="secondary"
                                      onClick={() => startEditMedication(medication)}
                                      disabled={deletingMedication[medication.id] || false}
                                    >
                                      Redigera
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      onClick={() =>
                                        handleDeleteMedication(
                                          medication.id,
                                          medication.patientId,
                                          medication.name,
                                        )
                                      }
                                      disabled={deletingMedication[medication.id] || false}
                                    >
                                      {deletingMedication[medication.id]
                                        ? "Tar bort..."
                                        : "Ta bort"}
                                    </Button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>

                      <div className={styles.addMedicationSection}>
                        {!isAdding ? (
                          <Button onClick={() => startAddMedication(patient.id)}>
                            Lägg till medicin
                          </Button>
                        ) : (
                          <form
                            onSubmit={(e) => handleCreateMedication(patient.id, e)}
                            className={styles.medicationForm}
                          >
                            <h4 className={styles.sectionTitle}>Lägg till ny medicin</h4>
                            <div className={styles.field}>
                              <label htmlFor={`add-med-name-${patient.id}`}>Namn *</label>
                              <input
                                id={`add-med-name-${patient.id}`}
                                type="text"
                                value={medicationFormData.name}
                                onChange={(e) =>
                                  setMedicationFormData((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                  }))
                                }
                                required
                                disabled={isSaving}
                                className={styles.input}
                              />
                            </div>
                            <div className={styles.field}>
                              <label htmlFor={`add-med-dosage-${patient.id}`}>Dosering *</label>
                              <input
                                id={`add-med-dosage-${patient.id}`}
                                type="text"
                                value={medicationFormData.dosage}
                                onChange={(e) =>
                                  setMedicationFormData((prev) => ({
                                    ...prev,
                                    dosage: e.target.value,
                                  }))
                                }
                                required
                                disabled={isSaving}
                                className={styles.input}
                                placeholder="t.ex. 500mg"
                              />
                            </div>
                            <div className={styles.field}>
                              <label htmlFor={`add-med-frequency-${patient.id}`}>Frekvens *</label>
                              <input
                                id={`add-med-frequency-${patient.id}`}
                                type="text"
                                value={medicationFormData.frequency}
                                onChange={(e) =>
                                  setMedicationFormData((prev) => ({
                                    ...prev,
                                    frequency: e.target.value,
                                  }))
                                }
                                required
                                disabled={isSaving}
                                className={styles.input}
                                placeholder="t.ex. 2 gånger per dag"
                              />
                            </div>
                            <div className={styles.field}>
                              <label htmlFor={`add-med-notes-${patient.id}`}>Anteckningar</label>
                              <textarea
                                id={`add-med-notes-${patient.id}`}
                                value={medicationFormData.notes}
                                onChange={(e) =>
                                  setMedicationFormData((prev) => ({
                                    ...prev,
                                    notes: e.target.value,
                                  }))
                                }
                                disabled={isSaving}
                                className={styles.textarea}
                                rows={3}
                              />
                            </div>
                            {medicationError[patient.id] && (
                              <div className={styles.error}>{medicationError[patient.id]}</div>
                            )}
                            <div className={styles.formActions}>
                              <Button type="submit" disabled={isSaving}>
                                {isSaving ? "Lägger till..." : "Lägg till"}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => cancelAddMedication(patient.id)}
                                disabled={isSaving}
                              >
                                Avbryt
                              </Button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
