export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Patient {
  id: number;
  name: string;
  email?: string | null;
  role?: string;
}

export interface Medication {
  id: number;
  patientId: number;
  name: string;
  dosage: string;
  frequency: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type MedicationCheckStatus = 'taken' | 'skipped' | 'missed';

export interface CheckInItem {
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
}

export interface CheckInSummary {
  total: number;
  taken: number;
  skipped: number;
  missed: number;
}

export interface CheckInResponse {
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
}

export interface Alert {
  id: number;
  patientId: number;
  createdBy: number;
  name: string;
  metricType: 'whoop' | 'medication';
  metricPath: string;
  operator: '<' | '>' | '=' | '<=' | '>=';
  thresholdValue: string;
  priority: 'high' | 'mid' | 'low';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveAlert {
  alert: {
    id: number;
    name: string;
    metricType: 'whoop' | 'medication';
    metricPath: string;
    operator: '<' | '>' | '=' | '<=' | '>=';
    thresholdValue: string;
    priority: 'high' | 'mid' | 'low';
  };
  currentValue: number;
  isActive: boolean;
  triggeredAt: number;
}

export interface WhoopStatus {
  connected: boolean;
  patientId?: number;
  patientName?: string;
  whoopUserId?: string;
  scope?: string | null;
  expiresAt?: string | null;
  lastSyncedAt?: string | null;
}

export interface WhoopMetricsResponse {
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
}

export interface HeartRateResponse {
  heartRate: number | null;
  cached: boolean;
  rateLimited: boolean;
  message?: string;
  nextAvailableAt?: string;
  timestamp?: number;
}

export interface PatientUser {
  userId: number;
  email: string;
  name: string;
  role: string;
  invitedAt: string;
  acceptedAt: string | null;
}
