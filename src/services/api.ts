const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";

export interface Organisation {
  organisationId: number;
  organisationName: string;
}

export interface Patient {
  id: number;
  name: string;
  email?: string | null;
  role?: string;
  organisationId?: number | null;
  userId?: number | null;
}

export interface ActiveAlert {
  alert: {
    id: number;
    name: string;
    metricType: "whoop" | "medication";
    metricPath: string;
    operator: "<" | ">" | "=" | "<=" | ">=";
    thresholdValue: string;
    priority: "high" | "mid" | "low";
  };
  currentValue: number;
  isActive: boolean;
  triggeredAt: number;
}

export interface HeartRateResponse {
  heartRate: number | null;
  cached: boolean;
  rateLimited: boolean;
  message?: string;
  nextAvailableAt?: string;
  timestamp?: number;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

export interface InviteUser {
  email: string;
  name: string;
  password: string;
  role: "patient" | "caregiver";
}

export interface InviteResult {
  created: Array<{ id: number; email: string; name: string }>;
  errors: Array<{ email: string; error: string }>;
}

export const apiService = {
  async createOrganisation(name?: string): Promise<Organisation> {
    return request<Organisation>("/api/organisations", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async getOrganisation(): Promise<Organisation> {
    return request<Organisation>("/api/organisations");
  },

  async getOrganisationPatients(): Promise<Patient[]> {
    return request<Patient[]>("/api/organisations/patients");
  },

  async inviteUsersToOrganisation(invites: InviteUser[]): Promise<InviteResult> {
    return request<InviteResult>("/api/organisations/invite-users", {
      method: "POST",
      body: JSON.stringify({ invites }),
    });
  },

  async getPatientAlerts(patientId: number): Promise<ActiveAlert[]> {
    return request<ActiveAlert[]>(`/api/alerts/active?patientId=${patientId}`);
  },

  async getPatientHeartRate(patientId: number): Promise<HeartRateResponse> {
    return request<HeartRateResponse>(`/api/heart-rate?patientId=${patientId}`);
  },
};
