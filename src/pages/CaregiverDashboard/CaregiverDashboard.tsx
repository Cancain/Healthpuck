import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import styles from "./CaregiverDashboard.module.css";
import Button from "../../components/Button/Button";
import { useAuth } from "../../auth/AuthContext";
import { apiService, type Patient, type ActiveAlert } from "../../services/api";

interface Organisation {
  organisationId: number;
  organisationName: string;
}

interface PatientData extends Patient {
  heartRate: number | null;
  activeAlerts: ActiveAlert[];
  loading: boolean;
}

const CaregiverDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [expandedPatientId, setExpandedPatientId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrganisation = useCallback(async () => {
    try {
      const org = await apiService.getOrganisation();
      setOrganisation(org);
    } catch (err) {
      console.error("Error loading organisation:", err);
      setError(err instanceof Error ? err.message : "Kunde inte ladda organisation");
    }
  }, []);

  const loadPatients = useCallback(async () => {
    try {
      const patientList = await apiService.getOrganisationPatients();
      setPatients(
        patientList.map((p) => ({
          ...p,
          heartRate: null,
          activeAlerts: [],
          loading: false,
        })),
      );
    } catch (err) {
      console.error("Error loading patients:", err);
      setError(err instanceof Error ? err.message : "Kunde inte ladda patienter");
    }
  }, []);

  const loadPatientData = useCallback(async (patientId: number) => {
    setPatients((prev) => prev.map((p) => (p.id === patientId ? { ...p, loading: true } : p)));

    try {
      const [heartRate, alerts] = await Promise.all([
        apiService.getPatientHeartRate(patientId).catch(() => ({ heartRate: null })),
        apiService.getPatientAlerts(patientId).catch(() => []),
      ]);

      setPatients((prev) =>
        prev.map((p) =>
          p.id === patientId
            ? {
                ...p,
                heartRate: heartRate.heartRate,
                activeAlerts: alerts,
                loading: false,
              }
            : p,
        ),
      );
    } catch (err) {
      console.error(`Error loading data for patient ${patientId}:`, err);
      setPatients((prev) => prev.map((p) => (p.id === patientId ? { ...p, loading: false } : p)));
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadOrganisation(), loadPatients()]);
      setLoading(false);
    };

    loadData();
  }, [user, loadOrganisation, loadPatients]);

  useEffect(() => {
    if (expandedPatientId) {
      loadPatientData(expandedPatientId);
    }
  }, [expandedPatientId, loadPatientData]);

  const togglePatient = (patientId: number) => {
    setExpandedPatientId(expandedPatientId === patientId ? null : patientId);
  };

  const getStatusIcon = (patient: PatientData): string => {
    const hasActiveAlerts = patient.activeAlerts.some((a) => a.isActive);
    if (hasActiveAlerts) {
      return "🔴";
    }
    return "🟢";
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Laddar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Välkommen {user?.name}</h1>
          <p className={styles.subtitle}>{user?.email}</p>
        </div>
        <div className={styles.caretakerBadge}>Omsorgsgivare</div>
      </div>

      {organisation && (
        <div className={styles.organisationSection}>
          <h2 className={styles.organisationTitle}>{organisation.organisationName}</h2>
        </div>
      )}

      <div className={styles.patientsList}>
        {patients.length === 0 ? (
          <div className={styles.emptyState}>Inga patienter hittades</div>
        ) : (
          patients.map((patient) => (
            <div key={patient.id} className={styles.patientItem}>
              <div className={styles.patientHeader} onClick={() => togglePatient(patient.id)}>
                <div className={styles.patientHeaderLeft}>
                  <span className={styles.statusIcon}>{getStatusIcon(patient)}</span>
                  <span className={styles.patientName}>{patient.name}</span>
                </div>
                <span className={styles.expandIcon}>
                  {expandedPatientId === patient.id ? "▼" : "▶"}
                </span>
              </div>

              {expandedPatientId === patient.id && (
                <div className={styles.patientDetails}>
                  {patient.loading ? (
                    <div className={styles.loading}>Laddar data...</div>
                  ) : (
                    <>
                      {patient.heartRate !== null && (
                        <div className={styles.heartRateSection}>
                          <span className={styles.heartRateLabel}>Hjärtfrekvens:</span>
                          <span className={styles.heartRateValue}>{patient.heartRate}</span>
                        </div>
                      )}

                      <div className={styles.alertsSection}>
                        <h3 className={styles.alertsTitle}>Aktiva alarm</h3>
                        {patient.activeAlerts.length === 0 ? (
                          <div className={styles.noAlerts}>Inga aktiva alarm</div>
                        ) : (
                          <div className={styles.alertsList}>
                            {patient.activeAlerts.map((activeAlert) => (
                              <div
                                key={activeAlert.alert.id}
                                className={`${styles.alertItem} ${
                                  activeAlert.isActive
                                    ? styles.alertTriggered
                                    : styles.alertNotTriggered
                                }`}
                              >
                                <div className={styles.alertName}>{activeAlert.alert.name}</div>
                                <div className={styles.alertPriority}>
                                  {activeAlert.alert.priority === "high"
                                    ? "Hög prioritet"
                                    : activeAlert.alert.priority === "mid"
                                      ? "Medel prioritet"
                                      : "Låg prioritet"}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className={styles.manageAlertsButton}>
                        <Button
                          onClick={() => navigate(`/settings/alerts?patientId=${patient.id}`)}
                        >
                          Hantera alarm
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CaregiverDashboardPage;
