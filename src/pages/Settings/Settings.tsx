import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import Button from "../../components/Button/Button";
import styles from "./Settings.module.css";
import { translateWhoopScope } from "../../utils/whoopTranslations";
import { whoopBluetooth } from "../../utils/whoopBluetooth";

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

interface WhoopStatus {
  connected: boolean;
  patientId?: number;
  patientName?: string;
  whoopUserId?: string;
  scope?: string | null;
  expiresAt?: string | null;
  lastSyncedAt?: string | null;
}

interface Alert {
  id: number;
  patientId: number;
  createdBy: number;
  name: string;
  metricType: "whoop" | "medication";
  metricPath: string;
  operator: "<" | ">" | "=" | "<=" | ">=";
  thresholdValue: string;
  priority: "high" | "mid" | "low";
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const SettingsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();

  // Validate tab parameter and redirect if invalid
  useEffect(() => {
    if (tab && tab !== "users" && tab !== "medications" && tab !== "whoop" && tab !== "alerts") {
      navigate("/settings/alerts", { replace: true });
    }
  }, [tab, navigate]);

  const activeTab: "users" | "medications" | "whoop" | "alerts" =
    tab === "users" || tab === "medications" || tab === "whoop" || tab === "alerts"
      ? tab
      : "alerts";
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
  const [whoopStatus, setWhoopStatus] = useState<WhoopStatus | null>(null);
  const [whoopLoading, setWhoopLoading] = useState<boolean>(false);
  const [whoopError, setWhoopError] = useState<string | null>(null);
  const [connectingWhoop, setConnectingWhoop] = useState<boolean>(false);
  const [disconnectingWhoop, setDisconnectingWhoop] = useState<boolean>(false);
  const [bluetoothConnected, setBluetoothConnected] = useState<boolean>(false);
  const [bluetoothError, setBluetoothError] = useState<string | null>(null);
  const [connectingBluetooth, setConnectingBluetooth] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState<boolean>(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [editingAlert, setEditingAlert] = useState<number | null>(null);
  const [alertFormData, setAlertFormData] = useState<{
    name: string;
    metricType: "whoop" | "medication" | "";
    metricPath: string;
    operator: "<" | ">" | "=" | "<=" | ">=" | "";
    thresholdValue: string;
    priority: "high" | "mid" | "low" | "";
    enabled: boolean;
  }>({
    name: "",
    metricType: "",
    metricPath: "",
    operator: "",
    thresholdValue: "",
    priority: "",
    enabled: true,
  });
  const [savingAlert, setSavingAlert] = useState<boolean>(false);
  const [deletingAlert, setDeletingAlert] = useState<Record<number, boolean>>({});

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

  const fetchWhoopStatus = useCallback(async () => {
    setWhoopLoading(true);
    setWhoopError(null);
    try {
      const res = await fetch(`${API_BASE}/api/integrations/whoop/status`, {
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404 || res.status === 401) {
          setWhoopStatus({ connected: false });
          return;
        }
        throw new Error("Kunde inte hämta Whoop-status");
      }

      const data = (await res.json()) as WhoopStatus;
      setWhoopStatus(data);
    } catch (err) {
      console.error("Error fetching Whoop status:", err);
      setWhoopError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setWhoopLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    let shouldReplace = false;

    const whoopResult = params.get("whoop");
    if (whoopResult === "connected") {
      setSuccessMessage("Whoop-anslutning lyckades!");
      setWhoopError(null);
      fetchWhoopStatus();
      params.delete("whoop");
      shouldReplace = true;
    }

    const whoopErrorParam = params.get("whoop_error");
    if (whoopErrorParam) {
      setWhoopError(whoopErrorParam);
      setSuccessMessage(null);
      params.delete("whoop_error");
      shouldReplace = true;
    }

    // Handle legacy tab query param - redirect to route
    const tabParam = params.get("tab");
    if (
      tabParam === "whoop" ||
      tabParam === "medications" ||
      tabParam === "users" ||
      tabParam === "alerts"
    ) {
      params.delete("tab");
      const search = params.toString();
      navigate(`/settings/${tabParam}${search ? `?${search}` : ""}`, { replace: true });
      return;
    }

    if (shouldReplace) {
      const search = params.toString();
      navigate({ search: search ? `?${search}` : "" }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, navigate, fetchWhoopStatus]);

  const handleWhoopConnect = async () => {
    setWhoopError(null);
    setConnectingWhoop(true);

    try {
      // First verify we're authenticated by checking the /me endpoint
      const meResponse = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include",
      });

      if (!meResponse.ok) {
        throw new Error("Du är inte inloggad. Vänligen logga in igen.");
      }

      // Create a form and submit it to ensure cookies are sent with the request
      // This works better than window.location.href for cross-domain requests
      const form = document.createElement("form");
      form.method = "GET";
      form.action = `${API_BASE}/api/integrations/whoop/connect`;
      form.style.display = "none";
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error("Error connecting to Whoop:", error);
      setWhoopError(error instanceof Error ? error.message : "Kunde inte ansluta till Whoop");
      setConnectingWhoop(false);
    }
  };

  const handleWhoopDisconnect = async () => {
    if (
      !window.confirm(
        "Är du säker på att du vill ta bort Whoop-anslutningen? Detta kommer att stoppa all data-synkronisering.",
      )
    ) {
      return;
    }

    setWhoopError(null);
    setDisconnectingWhoop(true);

    try {
      const res = await fetch(`${API_BASE}/api/integrations/whoop/disconnect`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Kunde inte ta bort Whoop-anslutning");
      }

      setSuccessMessage("Whoop-anslutning borttagen!");
      await fetchWhoopStatus();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setWhoopError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setDisconnectingWhoop(false);
    }
  };

  const handleBluetoothConnect = async () => {
    setBluetoothError(null);
    setConnectingBluetooth(true);

    try {
      if (!whoopBluetooth.isSupported()) {
        throw new Error(
          "Web Bluetooth stöds inte i denna webbläsare. Använd Chrome eller Edge för att ansluta till en riktig enhet.",
        );
      }

      whoopBluetooth.disableMockMode();
      await whoopBluetooth.connect();
      setBluetoothConnected(true);
      setSuccessMessage("Ansluten till Whoop-enhet via Bluetooth!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setBluetoothError(
        error instanceof Error ? error.message : "Bluetooth-anslutning misslyckades",
      );
      setBluetoothConnected(false);
    } finally {
      setConnectingBluetooth(false);
    }
  };

  const handleBluetoothConnectMock = async () => {
    setBluetoothError(null);
    setConnectingBluetooth(true);

    try {
      whoopBluetooth.enableMockMode();
      await whoopBluetooth.connect();
      setBluetoothConnected(true);
      setSuccessMessage("Ansluten till simulerad Whoop-enhet!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setBluetoothError(
        error instanceof Error ? error.message : "Kunde inte ansluta till simulerad enhet",
      );
      setBluetoothConnected(false);
    } finally {
      setConnectingBluetooth(false);
    }
  };

  const handleBluetoothDisconnect = async () => {
    try {
      await whoopBluetooth.disconnect();
      setBluetoothConnected(false);
      setSuccessMessage("Bluetooth-anslutning borttagen!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setBluetoothError(
        error instanceof Error ? error.message : "Kunde inte koppla från Bluetooth",
      );
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    try {
      const date = new Date(value);
      return date.toLocaleString();
    } catch {
      return value;
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

  const fetchAlerts = async () => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const res = await fetch(`${API_BASE}/api/alerts`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Kunde inte hämta varningar");
      }
      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      setAlertsError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setAlertsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchWhoopStatus();
    if (activeTab === "alerts") {
      fetchAlerts();
    }
    if (activeTab === "whoop") {
      const isConnected = whoopBluetooth.isConnected();
      setBluetoothConnected(isConnected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchWhoopStatus, activeTab]);

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

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertsError(null);

    if (!alertFormData.name.trim()) {
      setAlertsError("Namn krävs");
      return;
    }

    if (!alertFormData.metricType) {
      setAlertsError("Måtttyp krävs");
      return;
    }

    if (!alertFormData.metricPath.trim()) {
      setAlertsError("Måttväg krävs");
      return;
    }

    if (!alertFormData.operator) {
      setAlertsError("Operator krävs");
      return;
    }

    if (!alertFormData.thresholdValue.trim()) {
      setAlertsError("Tröskelvärde krävs");
      return;
    }

    if (!alertFormData.priority) {
      setAlertsError("Prioritet krävs");
      return;
    }

    if (patients.length === 0) {
      setAlertsError("Inga omsorgstagare hittades");
      return;
    }

    setSavingAlert(true);

    try {
      const patientId = patients[0].id;
      const res = await fetch(`${API_BASE}/api/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId,
          name: alertFormData.name.trim(),
          metricType: alertFormData.metricType,
          metricPath: alertFormData.metricPath.trim(),
          operator: alertFormData.operator,
          thresholdValue: alertFormData.thresholdValue.trim(),
          priority: alertFormData.priority,
          enabled: alertFormData.enabled,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Kunde inte skapa varning");
      }

      setSuccessMessage("Varning skapad!");
      setAlertFormData({
        name: "",
        metricType: "",
        metricPath: "",
        operator: "",
        thresholdValue: "",
        priority: "",
        enabled: true,
      });
      setShowCreateAlert(false);
      await fetchAlerts();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setAlertsError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setSavingAlert(false);
    }
  };

  const handleUpdateAlert = async (alertId: number, e: React.FormEvent) => {
    e.preventDefault();
    setAlertsError(null);

    if (!alertFormData.name.trim()) {
      setAlertsError("Namn krävs");
      return;
    }

    setSavingAlert(true);

    try {
      const res = await fetch(`${API_BASE}/api/alerts/${alertId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: alertFormData.name.trim(),
          metricType: alertFormData.metricType || undefined,
          metricPath: alertFormData.metricPath.trim() || undefined,
          operator: alertFormData.operator || undefined,
          thresholdValue: alertFormData.thresholdValue.trim() || undefined,
          priority: alertFormData.priority || undefined,
          enabled: alertFormData.enabled,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Kunde inte uppdatera varning");
      }

      setSuccessMessage("Varning uppdaterad!");
      setEditingAlert(null);
      setAlertFormData({
        name: "",
        metricType: "",
        metricPath: "",
        operator: "",
        thresholdValue: "",
        priority: "",
        enabled: true,
      });
      await fetchAlerts();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setAlertsError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setSavingAlert(false);
    }
  };

  const handleDeleteAlert = async (alertId: number, alertName: string) => {
    if (!window.confirm(`Är du säker på att du vill ta bort varningen "${alertName}"?`)) {
      return;
    }

    setDeletingAlert((prev) => ({ ...prev, [alertId]: true }));

    try {
      const res = await fetch(`${API_BASE}/api/alerts/${alertId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Kunde inte ta bort varning");
      }

      setSuccessMessage("Varning borttagen!");
      await fetchAlerts();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setAlertsError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setDeletingAlert((prev) => ({ ...prev, [alertId]: false }));
    }
  };

  const startEditAlert = (alert: Alert) => {
    setEditingAlert(alert.id);
    setAlertFormData({
      name: alert.name,
      metricType: alert.metricType,
      metricPath: alert.metricPath,
      operator: alert.operator,
      thresholdValue: alert.thresholdValue,
      priority: alert.priority,
      enabled: alert.enabled,
    });
    setAlertsError(null);
  };

  const cancelEditAlert = () => {
    setEditingAlert(null);
    setAlertFormData({
      name: "",
      metricType: "",
      metricPath: "",
      operator: "",
      thresholdValue: "",
      priority: "",
      enabled: true,
    });
    setAlertsError(null);
  };

  const startAddAlert = () => {
    setShowCreateAlert(true);
    setAlertFormData({
      name: "",
      metricType: "",
      metricPath: "",
      operator: "",
      thresholdValue: "",
      priority: "",
      enabled: true,
    });
    setAlertsError(null);
  };

  const cancelAddAlert = () => {
    setShowCreateAlert(false);
    setAlertFormData({
      name: "",
      metricType: "",
      metricPath: "",
      operator: "",
      thresholdValue: "",
      priority: "",
      enabled: true,
    });
    setAlertsError(null);
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
          onClick={() => navigate("/settings/users")}
        >
          Användare
        </button>
        <button
          className={activeTab === "medications" ? styles.tabActive : styles.tab}
          onClick={() => navigate("/settings/medications")}
        >
          Mediciner
        </button>
        <button
          className={activeTab === "alerts" ? styles.tabActive : styles.tab}
          onClick={() => navigate("/settings/alerts")}
        >
          Varningar
        </button>
        <button
          className={activeTab === "whoop" ? styles.tabActive : styles.tab}
          onClick={() => navigate("/settings/whoop")}
        >
          Whoop
        </button>
      </div>

      {successMessage && <div className={styles.success}>{successMessage}</div>}
      {whoopError && activeTab === "whoop" && <div className={styles.error}>{whoopError}</div>}

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

        {activeTab === "alerts" && (
          <>
            {patients.length === 0 ? (
              <p className={styles.empty}>Du har inga omsorgstagare ännu.</p>
            ) : (
              <div className={styles.alertsSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Varningar</h2>
                  {!showCreateAlert && !editingAlert && (
                    <Button onClick={startAddAlert}>Lägg till varning</Button>
                  )}
                </div>

                {alertsError && <div className={styles.error}>{alertsError}</div>}

                {alertsLoading ? (
                  <p>Laddar varningar...</p>
                ) : showCreateAlert || editingAlert ? (
                  <form
                    onSubmit={
                      editingAlert ? (e) => handleUpdateAlert(editingAlert, e) : handleCreateAlert
                    }
                    className={styles.alertForm}
                  >
                    <h3 className={styles.sectionTitle}>
                      {editingAlert ? "Redigera varning" : "Skapa ny varning"}
                    </h3>

                    <div className={styles.field}>
                      <label htmlFor="alertName">Namn *</label>
                      <input
                        id="alertName"
                        type="text"
                        value={alertFormData.name}
                        onChange={(e) =>
                          setAlertFormData((prev) => ({ ...prev, name: e.target.value }))
                        }
                        required
                        disabled={savingAlert}
                        className={styles.input}
                        placeholder="t.ex. Låg hjärtfrekvens"
                      />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="alertMetricType">Måtttyp *</label>
                      <select
                        id="alertMetricType"
                        value={alertFormData.metricType}
                        onChange={(e) =>
                          setAlertFormData((prev) => ({
                            ...prev,
                            metricType: e.target.value as "whoop" | "medication",
                            metricPath: "",
                          }))
                        }
                        required
                        disabled={savingAlert}
                        className={styles.input}
                      >
                        <option value="">Välj måtttyp</option>
                        <option value="whoop">Whoop</option>
                        <option value="medication">Medicin</option>
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="alertMetricPath">Mått *</label>
                      {alertFormData.metricType === "whoop" ? (
                        <select
                          id="alertMetricPath"
                          value={alertFormData.metricPath}
                          onChange={(e) =>
                            setAlertFormData((prev) => ({ ...prev, metricPath: e.target.value }))
                          }
                          required
                          disabled={savingAlert}
                          className={styles.input}
                        >
                          <option value="">Välj Whoop-mått</option>
                          <option value="heart_rate">Hjärtfrekvens</option>
                          <option value="recovery.score.recovery_score">Återhämtningspoäng</option>
                          <option value="recovery.score.resting_heart_rate">Vilopuls</option>
                          <option value="recovery.score.hrv_rmssd_milli">HRV RMSSD</option>
                          <option value="recovery.score.spo2_percentage">Syrehalt (%)</option>
                          <option value="sleep.score.sleep_performance_percentage">
                            Sömnprestanda (%)
                          </option>
                        </select>
                      ) : alertFormData.metricType === "medication" ? (
                        <select
                          id="alertMetricPath"
                          value={alertFormData.metricPath}
                          onChange={(e) =>
                            setAlertFormData((prev) => ({ ...prev, metricPath: e.target.value }))
                          }
                          required
                          disabled={savingAlert}
                          className={styles.input}
                        >
                          <option value="">Välj medicin-mått</option>
                          <option value="missed_dose">Missade doser (senaste 24h)</option>
                        </select>
                      ) : (
                        <input
                          id="alertMetricPath"
                          type="text"
                          value={alertFormData.metricPath}
                          onChange={(e) =>
                            setAlertFormData((prev) => ({ ...prev, metricPath: e.target.value }))
                          }
                          required
                          disabled={savingAlert}
                          className={styles.input}
                          placeholder="Måttväg"
                        />
                      )}
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="alertOperator">Operator *</label>
                      <select
                        id="alertOperator"
                        value={alertFormData.operator}
                        onChange={(e) =>
                          setAlertFormData((prev) => ({
                            ...prev,
                            operator: e.target.value as "<" | ">" | "=" | "<=" | ">=",
                          }))
                        }
                        required
                        disabled={savingAlert}
                        className={styles.input}
                      >
                        <option value="">Välj operator</option>
                        <option value="<">Mindre än (&lt;)</option>
                        <option value=">">Större än (&gt;)</option>
                        <option value="=">Lika med (=)</option>
                        <option value="<=">Mindre än eller lika med (&lt;=)</option>
                        <option value=">=">Större än eller lika med (&gt;=)</option>
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="alertThresholdValue">Tröskelvärde *</label>
                      <input
                        id="alertThresholdValue"
                        type="number"
                        step="any"
                        value={alertFormData.thresholdValue}
                        onChange={(e) =>
                          setAlertFormData((prev) => ({ ...prev, thresholdValue: e.target.value }))
                        }
                        required
                        disabled={savingAlert}
                        className={styles.input}
                        placeholder="t.ex. 20"
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.fieldLabel} htmlFor="alertPriority">
                        Prioritet *
                      </label>
                      <select
                        id="alertPriority"
                        value={alertFormData.priority}
                        onChange={(e) =>
                          setAlertFormData((prev) => ({
                            ...prev,
                            priority: e.target.value as "high" | "mid" | "low",
                          }))
                        }
                        required
                        disabled={savingAlert}
                        className={styles.input}
                      >
                        <option value="">Välj prioritet</option>
                        <option value="high">Hög (kontrolleras var 30:e sekund)</option>
                        <option value="mid">Medel (kontrolleras var 5:e minut)</option>
                        <option value="low">Låg (kontrolleras en gång per dag)</option>
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>
                        <input
                          className={styles.checkbox}
                          type="checkbox"
                          checked={alertFormData.enabled}
                          onChange={(e) =>
                            setAlertFormData((prev) => ({ ...prev, enabled: e.target.checked }))
                          }
                          disabled={savingAlert}
                        />
                        Aktiverad
                      </label>
                    </div>

                    <div className={styles.formActions}>
                      <Button type="submit" disabled={savingAlert}>
                        {savingAlert ? "Sparar..." : editingAlert ? "Spara" : "Skapa"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={editingAlert ? cancelEditAlert : cancelAddAlert}
                        disabled={savingAlert}
                      >
                        Avbryt
                      </Button>
                    </div>
                  </form>
                ) : alerts.length === 0 ? (
                  <p className={styles.emptyList}>Inga varningar ännu</p>
                ) : (
                  <ul className={styles.alertsList}>
                    {alerts.map((alert) => {
                      if (editingAlert === alert.id) {
                        return null;
                      }

                      return (
                        <li key={alert.id} className={styles.alertItem}>
                          <div className={styles.alertInfo}>
                            <div className={styles.alertHeader}>
                              <span className={styles.alertName}>{alert.name}</span>
                              <span
                                className={
                                  alert.enabled
                                    ? styles.alertStatusEnabled
                                    : styles.alertStatusDisabled
                                }
                              >
                                {alert.enabled ? "Aktiverad" : "Inaktiverad"}
                              </span>
                              <span className={styles.alertPriority}>
                                {alert.priority === "high"
                                  ? "Hög"
                                  : alert.priority === "mid"
                                    ? "Medel"
                                    : "Låg"}
                              </span>
                            </div>
                            <div className={styles.alertDetails}>
                              <span>
                                {alert.metricType === "whoop" ? "Whoop" : "Medicin"}:{" "}
                                {alert.metricPath}
                              </span>
                              <span>
                                {alert.operator} {alert.thresholdValue}
                              </span>
                            </div>
                          </div>
                          <div className={styles.alertActions}>
                            <Button
                              variant="secondary"
                              onClick={() => startEditAlert(alert)}
                              disabled={deletingAlert[alert.id] || false}
                            >
                              Redigera
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => handleDeleteAlert(alert.id, alert.name)}
                              disabled={deletingAlert[alert.id] || false}
                            >
                              {deletingAlert[alert.id] ? "Tar bort..." : "Ta bort"}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "whoop" && (
          <div className={styles.whoopCard}>
            <div className={styles.whoopHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Whoop-integration</h2>
                <p className={styles.whoopDescription}>
                  Koppla patientens Whoop-konto för att synkronisera data. Du omdirigeras till Whoop
                  för att logga in och godkänna åtkomst.
                </p>
              </div>
              <div className={styles.whoopActions}>
                {whoopStatus?.connected && (
                  <Button
                    variant="secondary"
                    onClick={handleWhoopDisconnect}
                    disabled={disconnectingWhoop || connectingWhoop}
                  >
                    {disconnectingWhoop ? "Tar bort..." : "Ta bort"}
                  </Button>
                )}
                <Button
                  onClick={handleWhoopConnect}
                  disabled={connectingWhoop || disconnectingWhoop}
                >
                  {connectingWhoop
                    ? "Startar..."
                    : whoopStatus?.connected
                      ? "Återanslut"
                      : "Koppla Whoop"}
                </Button>
              </div>
            </div>

            {whoopLoading ? (
              <p>Laddar Whoop-status...</p>
            ) : (
              <div className={styles.whoopStatus}>
                <div className={styles.whoopStatusRow}>
                  <span>Status:</span>
                  <strong
                    className={
                      whoopStatus?.connected ? styles.statusConnected : styles.statusDisconnected
                    }
                  >
                    {whoopStatus?.connected ? "Ansluten" : "Inte ansluten"}
                  </strong>
                </div>
                <div className={styles.whoopStatusRow}>
                  <span>Patient:</span>
                  <strong>
                    {whoopStatus?.patientName ||
                      (whoopStatus?.patientId ? `ID ${whoopStatus.patientId}` : "-")}
                  </strong>
                </div>
                {whoopStatus?.connected && (
                  <>
                    <div className={styles.whoopStatusRow}>
                      <span>Whoop-användar-ID:</span>
                      <strong>{whoopStatus.whoopUserId || "-"}</strong>
                    </div>
                    <div className={styles.whoopStatusRow}>
                      <span>Behörigheter:</span>
                      <strong>
                        {whoopStatus.scope ? translateWhoopScope(whoopStatus.scope) : "-"}
                      </strong>
                    </div>
                    <div className={styles.whoopStatusRow}>
                      <span>Token går ut:</span>
                      <strong>{formatDate(whoopStatus.expiresAt)}</strong>
                    </div>
                    <div className={styles.whoopStatusRow}>
                      <span>Senast synkad:</span>
                      <strong>{formatDate(whoopStatus.lastSyncedAt)}</strong>
                    </div>
                  </>
                )}
                {!whoopStatus?.connected && (
                  <p className={styles.whoopHint}>
                    Ingen Whoop-anslutning funnen för patienten. Klicka på &quot;Koppla Whoop&quot;
                    för att logga in på patientens Whoop-konto. Anslutningen delas automatiskt med
                    alla omsorgsgivare.
                  </p>
                )}
              </div>
            )}

            {patients.some((p) => p.role === "patient") && (
              <div className={styles.bluetoothSection}>
                <h3 className={styles.sectionTitle}>Bluetooth-anslutning</h3>
                <p className={styles.whoopDescription}>
                  Anslut direkt till Whoop-enheten via Bluetooth för realtidsdata om hjärtfrekvens.
                </p>
                {!bluetoothConnected ? (
                  <div className={styles.bluetoothButtons}>
                    <Button
                      onClick={handleBluetoothConnect}
                      disabled={connectingBluetooth || !whoopBluetooth.isSupported()}
                      tooltip={
                        !whoopBluetooth.isSupported()
                          ? "Web Bluetooth är inte tillgängligt. Kontrollera att din webbläsare stödjer Web Bluetooth API och att du använder HTTPS eller localhost."
                          : connectingBluetooth
                            ? "Ansluter till enheten..."
                            : undefined
                      }
                    >
                      {connectingBluetooth ? "Ansluter..." : "Anslut till Bluetooth-enhet"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleBluetoothConnectMock}
                      disabled={connectingBluetooth}
                    >
                      {connectingBluetooth ? "Ansluter..." : "Använd simulerad enhet"}
                    </Button>
                    {!whoopBluetooth.isSupported() && (
                      <p className={styles.bluetoothHint}>
                        Web Bluetooth är inte tillgängligt. Kontrollera att:
                        <br />
                        • Du använder Chrome eller Edge
                        <br />
                        • Sidan körs på HTTPS eller localhost
                        <br />• Web Bluetooth är aktiverat i webbläsarens inställningar
                      </p>
                    )}
                  </div>
                ) : (
                  <div className={styles.bluetoothStatus}>
                    <Button variant="secondary" onClick={handleBluetoothDisconnect}>
                      Koppla från Bluetooth
                    </Button>
                    <span className={styles.bluetoothStatusText}>
                      {whoopBluetooth.isMockMode() ? "Simulerad enhet ansluten" : "Enhet ansluten"}
                    </span>
                  </div>
                )}
                {bluetoothConnected && (
                  <div className={styles.whoopStatusRow}>
                    <span>Bluetooth-status:</span>
                    <strong className={styles.statusConnected}>
                      Ansluten {whoopBluetooth.isMockMode() ? "(Simulerad)" : "(Enhet)"}
                    </strong>
                  </div>
                )}
                {bluetoothError && <p className={styles.bluetoothError}>{bluetoothError}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
