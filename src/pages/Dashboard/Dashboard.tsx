import React, { useCallback, useEffect, useMemo, useState } from "react";

import styles from "./Dashboard.module.css";
import Button from "../../components/Button/Button";
import { whoopBluetooth } from "../../utils/whoopBluetooth";
import { translateWhoopField } from "../../utils/whoopTranslations";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";
const CHECK_IN_RANGE_DAYS = 7;

type MeResponse = {
  id: number;
  email: string;
  name: string;
};

type Patient = {
  id: number;
  name: string;
  email?: string | null;
  role?: string;
};

type Medication = {
  id: number;
  patientId: number;
  name: string;
  dosage: string;
  frequency: string;
  notes?: string | null;
};

type WhoopMetricsResponse = {
  patientId: number;
  patientName?: string;
  range: {
    start: string;
    end: string;
    days: number;
  };
  cycles?: unknown;
  recovery?: unknown;
  sleep?: unknown;
  workouts?: unknown;
  bodyMeasurement?: unknown;
};

type WhoopMetricsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: WhoopMetricsResponse }
  | { status: "disconnected" }
  | { status: "error"; error: string };

type HeartRateResponse = {
  heartRate: number | null;
  cached: boolean;
  rateLimited: boolean;
  message?: string;
  nextAvailableAt?: string;
  timestamp?: number;
};

type HeartRateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: HeartRateResponse }
  | { status: "error"; error: string };

type MedicationCheckStatus = "taken" | "skipped" | "missed";

type CheckInSummary = {
  total: number;
  taken: number;
  skipped: number;
  missed: number;
};

type CheckInItem = {
  id: number;
  patientId: number;
  medicationId: number;
  medicationName: string;
  medicationDosage: string;
  status: MedicationCheckStatus;
  scheduledFor: string | null;
  takenAt: string;
  notes: string | null;
  recordedByUserId: number | null;
  recordedByName: string | null;
};

type CheckInResponse = {
  patientId: number;
  medicationId: number | null;
  range: {
    start: string;
    end: string;
    days: number;
  };
  limit: number;
  summary: CheckInSummary;
  checkIns: CheckInItem[];
};

type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: T }
  | { status: "error"; error: string };

type CheckInState = AsyncState<CheckInResponse>;

type Feedback = { type: "success" | "error"; message: string } | null;

const DashboardPage: React.FC = () => {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [whoopMetrics, setWhoopMetrics] = useState<WhoopMetricsState>({ status: "idle" });
  const [heartRateState, setHeartRateState] = useState<HeartRateState>({ status: "idle" });
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  const [bluetoothError, setBluetoothError] = useState<string | null>(null);

  const [patientState, setPatientState] = useState<AsyncState<Patient | null>>({ status: "idle" });
  const [medicationState, setMedicationState] = useState<AsyncState<Medication[]>>({
    status: "idle",
  });
  const [checkInsState, setCheckInsState] = useState<CheckInState>({ status: "idle" });

  const [checkInNotes, setCheckInNotes] = useState<Record<number, string>>({});
  const [checkInSubmittingId, setCheckInSubmittingId] = useState<number | null>(null);
  const [checkInFeedback, setCheckInFeedback] = useState<Feedback>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Inte inloggad");
        if (!cancelled) {
          setMe(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Något gick fel");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!me) return;

    let cancelled = false;
    setPatientState({ status: "loading" });

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/patients`, { credentials: "include" });
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error((data as any).error || "Kunde inte hämta patient");
        if (!cancelled) {
          const list = (data as Patient[]) || [];
          const mainPatient =
            list.find((entry) => entry.role === "patient") ?? list.find(Boolean) ?? null;
          setPatientState({ status: "loaded", data: mainPatient ?? null });
        }
      } catch (err) {
        if (!cancelled) {
          setPatientState({
            status: "error",
            error: err instanceof Error ? err.message : "Kunde inte hämta patient",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me]);

  useEffect(() => {
    if (!me) return;

    let cancelled = false;
    setWhoopMetrics({ status: "loading" });

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/integrations/whoop/metrics`, {
          credentials: "include",
        });

        if (res.status === 404) {
          if (!cancelled) setWhoopMetrics({ status: "disconnected" });
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load Whoop data");
        if (!cancelled) {
          setWhoopMetrics({ status: "loaded", data });
        }
      } catch (err) {
        if (!cancelled) {
          setWhoopMetrics({
            status: "error",
            error: err instanceof Error ? err.message : "Kunde inte hämta Whoop-data",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me]);

  const patient = patientState.status === "loaded" ? patientState.data : null;

  useEffect(() => {
    if (!me || !patient) return;

    let cancelled = false;
    let bluetoothCleanup: (() => Promise<void>) | null = null;

    const tryBluetoothConnection = async () => {
      if (!whoopBluetooth.isSupported() && !whoopBluetooth.isMockMode()) {
        whoopBluetooth.enableMockMode();
      }

      try {
        setBluetoothError(null);
        await whoopBluetooth.connect();
        setBluetoothConnected(true);

        await whoopBluetooth.startHeartRateMonitoring((heartRate: number) => {
          if (!cancelled) {
            setHeartRateState({
              status: "loaded",
              data: {
                heartRate,
                cached: false,
                rateLimited: false,
                timestamp: Date.now(),
              },
            });
          }
        });

        bluetoothCleanup = async () => {
          try {
            await whoopBluetooth.stopHeartRateMonitoring();
            await whoopBluetooth.disconnect();
          } catch (error) {
            console.error("Error disconnecting Bluetooth:", error);
          }
        };
      } catch (error) {
        console.error("Bluetooth connection failed:", error);
        setBluetoothError(error instanceof Error ? error.message : "Bluetooth connection failed");
        setBluetoothConnected(false);
        setHeartRateState({ status: "idle" });
      }
    };

    tryBluetoothConnection();

    return () => {
      cancelled = true;
      if (bluetoothCleanup) {
        bluetoothCleanup();
      }
    };
  }, [me, patient]);

  const patientLoading = patientState.status === "loading";
  const patientError = patientState.status === "error" ? patientState.error : null;

  const medications = medicationState.status === "loaded" ? medicationState.data : [];
  const medicationsLoading = medicationState.status === "loading";
  const medicationsError = medicationState.status === "error" ? medicationState.error : null;

  const checkInsData = checkInsState.status === "loaded" ? checkInsState.data : null;

  const loadMedications = useCallback(async () => {
    if (!patient?.id) {
      setMedicationState({ status: "loaded", data: [] });
      return;
    }

    setMedicationState({ status: "loading" });
    try {
      const res = await fetch(`${API_BASE}/api/medications/patient/${patient.id}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error((data as any).error || "Kunde inte hämta läkemedel");
      setMedicationState({ status: "loaded", data: data as Medication[] });
    } catch (err) {
      setMedicationState({
        status: "error",
        error: err instanceof Error ? err.message : "Kunde inte hämta läkemedel",
      });
    }
  }, [patient]);

  const loadCheckIns = useCallback(async () => {
    if (!patient?.id) {
      setCheckInsState({
        status: "loaded",
        data: {
          patientId: 0,
          medicationId: null,
          range: {
            start: new Date().toISOString(),
            end: new Date().toISOString(),
            days: CHECK_IN_RANGE_DAYS,
          },
          limit: 0,
          summary: { total: 0, taken: 0, skipped: 0, missed: 0 },
          checkIns: [],
        },
      });
      return;
    }

    setCheckInsState({ status: "loading" });
    try {
      const res = await fetch(`${API_BASE}/api/check-ins?range=${CHECK_IN_RANGE_DAYS}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Kunde inte hämta check-ins");
      setCheckInsState({ status: "loaded", data: data as CheckInResponse });
    } catch (err) {
      setCheckInsState({
        status: "error",
        error: err instanceof Error ? err.message : "Kunde inte hämta check-ins",
      });
    }
  }, [patient]);

  useEffect(() => {
    if (patientState.status !== "loaded") return;
    loadMedications();
    loadCheckIns();
  }, [patientState, loadMedications, loadCheckIns]);

  const handleNoteChange = useCallback((medicationId: number, value: string) => {
    setCheckInNotes((prev) => ({ ...prev, [medicationId]: value }));
  }, []);

  const handleCheckInSubmit = useCallback(
    async (medicationId: number) => {
      setCheckInFeedback(null);
      setCheckInSubmittingId(medicationId);

      try {
        const note = checkInNotes[medicationId]?.trim();
        const payload: Record<string, unknown> = { medicationId, status: "taken" };
        if (note) payload.notes = note;

        const res = await fetch(`${API_BASE}/api/check-ins`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Kunde inte spara check-in");

        setCheckInNotes((prev) => ({ ...prev, [medicationId]: "" }));
        await loadCheckIns();
        setCheckInFeedback({
          type: "success",
          message:
            data && data.medicationName
              ? `${data.medicationName} markerat som taget`
              : "Check-in registrerad",
        });
      } catch (err) {
        setCheckInFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Kunde inte spara check-in",
        });
      } finally {
        setCheckInSubmittingId(null);
      }
    },
    [checkInNotes, loadCheckIns],
  );

  const whoopRangeLabel = useMemo(() => {
    if (whoopMetrics.status !== "loaded") return null;
    const { start, end, days } = whoopMetrics.data.range;
    return `${new Date(start).toLocaleDateString()} – ${new Date(end).toLocaleDateString()} (${days} dagar)`;
  }, [whoopMetrics]);

  const checkInRangeLabel = useMemo(() => {
    if (!checkInsData) return null;
    const { start, end, days } = checkInsData.range;
    return `${new Date(start).toLocaleDateString()} – ${new Date(end).toLocaleDateString()} (${days} dagar)`;
  }, [checkInsData]);

  const checkInSummary = checkInsData?.summary;

  const latestCheckInByMedication = useMemo(() => {
    const map = new Map<number, CheckInItem>();
    if (!checkInsData) return map;
    for (const entry of checkInsData.checkIns) {
      const existing = map.get(entry.medicationId);
      if (!existing || new Date(entry.takenAt).getTime() > new Date(existing.takenAt).getTime()) {
        map.set(entry.medicationId, entry);
      }
    }
    return map;
  }, [checkInsData]);

  if (error) return <p className={styles.feedback}>{error}</p>;
  if (!me)
    return (
      <div className={styles.feedback}>
        <p>Laddar användare...</p>
      </div>
    );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Välkommen, {me.name}</h1>
          <p className={styles.subtitle}>{me.email}</p>
        </div>
        {patient && (
          <div className={styles.patientBadge}>
            <span>Patient</span>
            <strong>{patient.name}</strong>
          </div>
        )}
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Whoop-status</h2>
          {whoopRangeLabel && <span className={styles.rangeBadge}>{whoopRangeLabel}</span>}
        </div>
        {heartRateState.status === "loaded" && (
          <HeartRateDisplay
            data={heartRateState.data}
            bluetoothConnected={bluetoothConnected}
            bluetoothError={bluetoothError}
            onBluetoothConnect={async () => {
              try {
                setBluetoothError(null);
                if (!whoopBluetooth.isSupported() && !whoopBluetooth.isMockMode()) {
                  whoopBluetooth.enableMockMode();
                }
                await whoopBluetooth.connect();
                setBluetoothConnected(true);
                await whoopBluetooth.startHeartRateMonitoring((heartRate: number) => {
                  setHeartRateState({
                    status: "loaded",
                    data: {
                      heartRate,
                      cached: false,
                      rateLimited: false,
                      timestamp: Date.now(),
                    },
                  });
                });
              } catch (error) {
                setBluetoothError(
                  error instanceof Error ? error.message : "Bluetooth connection failed",
                );
                setBluetoothConnected(false);
              }
            }}
          />
        )}
        {whoopMetrics.status === "idle" || whoopMetrics.status === "loading" ? (
          <div className={styles.feedbackCard}>Hämtar Whoop-data...</div>
        ) : whoopMetrics.status === "error" ? (
          <div className={styles.errorCard}>Kunde inte hämta Whoop-data: {whoopMetrics.error}</div>
        ) : whoopMetrics.status === "disconnected" ? (
          <div className={styles.feedbackCard}>
            Ingen Whoop-anslutning hittades. Gå till inställningarna för att koppla Whoop.
          </div>
        ) : (
          <WhoopMetricsView data={whoopMetrics.data} />
        )}
      </section>

      <section className={`${styles.section} ${styles.medSection}`}>
        <div className={styles.sectionHeader}>
          <h2>Läkemedel & check-ins</h2>
          {checkInRangeLabel && <span className={styles.rangeBadge}>{checkInRangeLabel}</span>}
        </div>

        {patientLoading && <div className={styles.feedbackCard}>Hämtar patient...</div>}
        {patientError && (
          <div className={styles.errorCard}>Kunde inte hämta patient: {patientError}</div>
        )}
        {patientState.status === "loaded" && !patient && (
          <div className={styles.feedbackCard}>Ingen patient kopplad till ditt konto ännu.</div>
        )}

        {patient && (
          <>
            {checkInSummary && (
              <div className={styles.summaryRow}>
                <SummaryItem label="Registrerade" value={checkInSummary.total} />
                <SummaryItem label="Tagna" value={checkInSummary.taken} tone="success" />
                <SummaryItem label="Hoppade över" value={checkInSummary.skipped} tone="warning" />
                <SummaryItem label="Missade" value={checkInSummary.missed} tone="danger" />
              </div>
            )}

            {checkInFeedback && (
              <div
                className={
                  checkInFeedback.type === "success" ? styles.feedbackCard : styles.errorCard
                }
              >
                {checkInFeedback.message}
              </div>
            )}

            {medicationsLoading ? (
              <div className={styles.feedbackCard}>Hämtar läkemedel...</div>
            ) : medicationsError ? (
              <div className={styles.errorCard}>Kunde inte hämta läkemedel: {medicationsError}</div>
            ) : medications.length === 0 ? (
              <div className={styles.feedbackCard}>Inga läkemedel är registrerade ännu.</div>
            ) : (
              <div className={styles.medGrid}>
                {medications.map((medication) => (
                  <MedicationCard
                    key={medication.id}
                    medication={medication}
                    latest={latestCheckInByMedication.get(medication.id)}
                    note={checkInNotes[medication.id] ?? ""}
                    onNoteChange={handleNoteChange}
                    onCheckIn={handleCheckInSubmit}
                    loading={checkInSubmittingId === medication.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

type HeartRateDisplayProps = {
  data: HeartRateResponse;
  bluetoothConnected: boolean;
  bluetoothError: string | null;
  onBluetoothConnect: () => Promise<void>;
};

const HeartRateDisplay: React.FC<HeartRateDisplayProps> = ({
  data,
  bluetoothConnected,
  bluetoothError,
  onBluetoothConnect,
}) => {
  return (
    <div className={styles.heartRateCard}>
      <div className={styles.heartRateHeader}>
        <h3>Hjärtfrekvens</h3>
        {bluetoothConnected && <span className={styles.bluetoothBadge}>Live</span>}
        {data.cached && <span className={styles.cachedBadge}>Cached</span>}
        {data.rateLimited && <span className={styles.rateLimitBadge}>Rate Limited</span>}
      </div>
      <div className={styles.heartRateValue}>
        {data.heartRate !== null ? (
          <>
            <strong>{data.heartRate}</strong>
            <span className={styles.heartRateUnit}> bpm</span>
          </>
        ) : (
          <span className={styles.heartRateUnavailable}>Ingen data tillgänglig</span>
        )}
      </div>
      {!bluetoothConnected && (
        <button onClick={onBluetoothConnect} className={styles.bluetoothButton}>
          {whoopBluetooth.isSupported()
            ? "Anslut Whoop via Bluetooth för realtidsdata"
            : "Aktivera simulerad Whoop-enhet"}
        </button>
      )}
      {bluetoothError && (
        <p className={styles.heartRateMessage} style={{ color: "red" }}>
          {bluetoothError}
        </p>
      )}
      {data.message && <p className={styles.heartRateMessage}>{data.message}</p>}
      {data.timestamp && (
        <p className={styles.heartRateTimestamp}>
          Uppdaterad: {new Date(data.timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
};

type WhoopMetricsViewProps = {
  data: WhoopMetricsResponse;
};

const WhoopMetricsView: React.FC<WhoopMetricsViewProps> = ({ data }) => {
  return (
    <div className={styles.cardsGrid}>
      <MetricCard title="Cykler" payload={data.cycles} />
      <MetricCard title="Återhämtning" payload={data.recovery} />
      <MetricCard title="Sömn" payload={data.sleep} />
      <MetricCard title="Träning" payload={data.workouts} />
      <MetricCard title="Kroppsmått" payload={data.bodyMeasurement} allowSingleRecord />
    </div>
  );
};

type MetricCardProps = {
  title: string;
  payload: unknown;
  allowSingleRecord?: boolean;
};

const MetricCard: React.FC<MetricCardProps> = ({ title, payload, allowSingleRecord = false }) => {
  const records = extractRecords(payload, allowSingleRecord);
  const latest = useMemo(() => findLatest(records), [records]);
  const metricPairs = useMemo(() => (latest ? collectMetricPairs(latest) : []), [latest]);

  return (
    <article className={styles.metricCard}>
      <header className={styles.metricHeader}>
        <h3>{title}</h3>
      </header>
      {latest ? (
        <>
          {latest.timestamp && (
            <p className={styles.metricMeta}>
              Senaste:{" "}
              {new Date(latest.timestamp).toLocaleTimeString("sv-SE", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                timeZone: "Europe/Stockholm",
              })}
            </p>
          )}
          <ul className={styles.metricValues}>
            {metricPairs.length === 0 && <li>Inga numeriska värden att visa</li>}
            {metricPairs.map(([key, value]) => {
              const keysToHide = [
                "id",
                "user_id",
                "sport_id",
                "cycle_id",
                "score.percent_recorded",
              ];
              if (keysToHide.includes(key)) return null;

              return (
                <li key={key}>
                  <span>{translateWhoopField(key)}</span>
                  <strong>{formatNumber(value)}</strong>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <>
          <p className={styles.metricMeta}>Inga data i valt intervall.</p>
          {payload && (
            <details className={styles.metricDetails}>
              <summary>Visa råpayload (debug)</summary>
              <pre className={styles.jsonPreview}>{JSON.stringify(payload, null, 2)}</pre>
            </details>
          )}
        </>
      )}
    </article>
  );
};

type NormalizedRecord = {
  raw: any;
  timestamp?: string;
};

function extractRecords(payload: unknown, allowSingleRecord: boolean): NormalizedRecord[] {
  if (!payload) return [];

  const wrap = (value: any): NormalizedRecord => ({
    raw: value,
    timestamp: extractTimestamp(value),
  });

  if (Array.isArray(payload)) {
    return payload.map(wrap);
  }

  if (typeof payload === "object" && payload !== null) {
    const candidate = payload as Record<string, unknown>;

    // Check for common array properties
    if (Array.isArray(candidate.records)) {
      return candidate.records.map(wrap);
    }
    if (Array.isArray(candidate.data)) {
      return candidate.data.map(wrap);
    }
    if (Array.isArray(candidate.values)) {
      return candidate.values.map(wrap);
    }
    if (Array.isArray(candidate.items)) {
      return candidate.items.map(wrap);
    }
    if (Array.isArray(candidate.results)) {
      return candidate.results.map(wrap);
    }

    // Check if any property is an array (for flexible parsing)
    for (const [, value] of Object.entries(candidate)) {
      if (Array.isArray(value) && value.length > 0) {
        // Only use this if it looks like a data array (not metadata)
        if (typeof value[0] === "object" && value[0] !== null) {
          return value.map(wrap);
        }
      }
    }

    if (allowSingleRecord) {
      return [wrap(candidate)];
    }

    // Debug: log structure when no records found
    console.warn("extractRecords: No array found in payload", {
      keys: Object.keys(candidate),
      payloadType: typeof payload,
      allowSingleRecord,
    });
  }

  return [];
}

function findLatest(records: NormalizedRecord[]): NormalizedRecord | undefined {
  if (records.length === 0) return undefined;
  return records.slice().sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return bTime - aTime;
  })[0];
}

function extractTimestamp(record: Record<string, any>): string | undefined {
  const candidates = [
    record.end,
    record.end_time,
    record.created_at,
    record.start,
    record.start_time,
    record.collected_at,
    record.timestamp,
    record.updated_at,
  ];
  const found = candidates.find((value) => typeof value === "string" || typeof value === "number");
  if (!found) return undefined;
  return typeof found === "number" ? new Date(found).toISOString() : found;
}

function collectMetricPairs(record: NormalizedRecord): Array<[string, number]> {
  const seen = new Set<string>();
  const results: Array<[string, number]> = [];

  function visit(value: any, path: string, depth: number) {
    if (results.length >= 8) return;

    if (typeof value === "number" && !Number.isNaN(value)) {
      if (!seen.has(path)) {
        seen.add(path);
        results.push([path, value]);
      }
      return;
    }

    if (!value || typeof value !== "object" || depth >= 2) {
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      const nextPath = path ? `${path}.${key}` : key;
      visit(child, nextPath, depth + 1);
      if (results.length >= 8) break;
    }
  }

  visit(record.raw ?? record, "", 0);
  return results;
}

function formatDate(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

type MedicationCardProps = {
  medication: Medication;
  latest: CheckInItem | undefined;
  note: string;
  onNoteChange: (medicationId: number, value: string) => void;
  onCheckIn: (medicationId: number) => void;
  loading: boolean;
};

const MedicationCard: React.FC<MedicationCardProps> = ({
  medication,
  latest,
  note,
  onNoteChange,
  onCheckIn,
  loading,
}) => {
  const lastStatusText = latest ? translateStatus(latest.status) : null;
  return (
    <article className={styles.medCard}>
      <header className={styles.medHeader}>
        <h3>{medication.name}</h3>
        <p className={styles.medDosage}>{medication.dosage}</p>
        <p className={styles.medFrequency}>{medication.frequency}</p>
        {medication.notes && <p className={styles.medNotes}>{medication.notes}</p>}
      </header>
      <div className={styles.medStatusRow}>
        {latest ? (
          <>
            <span className={statusClassName(latest.status)}>{lastStatusText}</span>
            <span className={styles.medMeta}>{formatDate(latest.takenAt)}</span>
            {latest.recordedByName && (
              <span className={styles.medMeta}>· {latest.recordedByName}</span>
            )}
          </>
        ) : (
          <span className={styles.medMeta}>Inga check-ins registrerade ännu.</span>
        )}
      </div>
      <label className={styles.noteLabel} htmlFor={`note-${medication.id}`}>
        Anteckning (valfritt)
      </label>
      <textarea
        id={`note-${medication.id}`}
        className={styles.noteInput}
        rows={3}
        value={note}
        onChange={(event) => onNoteChange(medication.id, event.target.value)}
        placeholder="Lägg till en kommentar till detta intag"
      />
      <Button type="button" onClick={() => onCheckIn(medication.id)} disabled={loading}>
        {loading ? "Sparar..." : "Markera tagen"}
      </Button>
    </article>
  );
};

type SummaryItemProps = {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "danger";
};

const SummaryItem: React.FC<SummaryItemProps> = ({ label, value, tone = "default" }) => (
  <div className={styles.summaryItem}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

function translateStatus(status: MedicationCheckStatus) {
  switch (status) {
    case "taken":
      return "Tagen";
    case "skipped":
      return "Hoppad över";
    case "missed":
      return "Missad";
    default:
      return status;
  }
}

function statusClassName(status: MedicationCheckStatus) {
  const toneClass = styles[`status_${status}` as keyof typeof styles] ?? "";
  return `${styles.statusBadge} ${toneClass}`.trim();
}

export default DashboardPage;
