import {API_BASE_URL, API_ENDPOINTS} from '../config';
import {authService} from './auth';
import type {
  User,
  Patient,
  Medication,
  CheckInResponse,
  CheckInItem,
  Alert,
  ActiveAlert,
  WhoopStatus,
  WhoopMetricsResponse,
  HeartRateResponse,
  PatientUser,
} from '../types/api';

export interface HeartRateReading {
  heartRate: number;
  source: 'bluetooth' | 'api';
}

export class ApiService {
  private static instance: ApiService;
  private offlineQueue: HeartRateReading[] = [];

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await authService.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  async uploadHeartRate(
    heartRate: number,
    source: 'bluetooth' | 'api' = 'bluetooth',
  ): Promise<HeartRateResponse> {
    const reading: HeartRateReading = {heartRate, source};

    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.HEART_RATE}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(reading),
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh or logout
          await authService.logout();
          throw new Error('Authentication failed');
        }

        if (response.status === 429) {
          // Rate limited - queue for later
          this.offlineQueue.push(reading);
          throw new Error('Rate limited');
        }

        const error = await response
          .json()
          .catch(() => ({error: 'Upload failed'}));
        throw new Error(error.error || 'Upload failed');
      }

      const data: HeartRateResponse = await response.json();

      // If upload successful, try to process offline queue
      await this.processOfflineQueue();

      return data;
    } catch (error: any) {
      // If network error, queue for later
      if (
        error.message.includes('Network') ||
        error.message.includes('fetch')
      ) {
        this.offlineQueue.push(reading);
        console.log(
          'Network error, queued reading. Queue size:',
          this.offlineQueue.length,
        );
      }
      throw error;
    }
  }

  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) {
      return;
    }

    const headers = await this.getAuthHeaders();
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const reading of queue) {
      try {
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.HEART_RATE}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(reading),
        });
      } catch (error) {
        // If still failing, add back to queue
        this.offlineQueue.push(reading);
        break;
      }
    }
  }

  getOfflineQueueSize(): number {
    return this.offlineQueue.length;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        await authService.logout();
        throw new Error('Authentication failed');
      }
      const error = await response
        .json()
        .catch(() => ({error: 'Request failed'}));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async getMe(): Promise<User> {
    return this.request<User>(API_ENDPOINTS.ME);
  }

  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<{user: User; token: string}> {
    return this.request<{user: User; token: string}>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({email, password, name}),
    });
  }

  async getPatients(): Promise<Patient[]> {
    return this.request<Patient[]>('/api/patients');
  }

  async createPatient(
    name: string,
    email: string,
    password: string,
  ): Promise<Patient> {
    return this.request<Patient>('/api/patients', {
      method: 'POST',
      body: JSON.stringify({name, email, password}),
    });
  }

  async deletePatient(patientId: number): Promise<void> {
    await this.request(`/api/patients/${patientId}`, {
      method: 'DELETE',
    });
  }

  async getPatientUsers(patientId: number): Promise<PatientUser[]> {
    return this.request<PatientUser[]>(`/api/patients/${patientId}/users`);
  }

  async inviteUser(
    patientId: number,
    email: string,
    role: 'patient' | 'caregiver',
  ): Promise<void> {
    await this.request(`/api/patients/${patientId}/invite`, {
      method: 'POST',
      body: JSON.stringify({email, role}),
    });
  }

  async getMedications(patientId: number): Promise<Medication[]> {
    return this.request<Medication[]>(`/api/medications/patient/${patientId}`);
  }

  async createMedication(
    patientId: number,
    name: string,
    dosage: string,
    frequency: string,
    notes?: string | null,
  ): Promise<Medication> {
    return this.request<Medication>('/api/medications', {
      method: 'POST',
      body: JSON.stringify({
        patientId,
        name,
        dosage,
        frequency,
        notes: notes || null,
      }),
    });
  }

  async updateMedication(
    medicationId: number,
    name: string,
    dosage: string,
    frequency: string,
    notes?: string | null,
  ): Promise<Medication> {
    return this.request<Medication>(`/api/medications/${medicationId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        dosage,
        frequency,
        notes: notes || null,
      }),
    });
  }

  async deleteMedication(medicationId: number): Promise<void> {
    await this.request(`/api/medications/${medicationId}`, {
      method: 'DELETE',
    });
  }

  async getCheckIns(range?: number): Promise<CheckInResponse> {
    const query = range ? `?range=${range}` : '';
    return this.request<CheckInResponse>(`/api/check-ins${query}`);
  }

  async createCheckIn(
    medicationId: number,
    status: 'taken' | 'skipped' | 'missed' = 'taken',
    notes?: string,
  ): Promise<CheckInItem> {
    return this.request<CheckInItem>('/api/check-ins', {
      method: 'POST',
      body: JSON.stringify({
        medicationId,
        status,
        notes: notes || null,
      }),
    });
  }

  async getAlerts(): Promise<Alert[]> {
    return this.request<Alert[]>('/api/alerts');
  }

  async getActiveAlerts(): Promise<ActiveAlert[]> {
    return this.request<ActiveAlert[]>('/api/alerts/active');
  }

  async createAlert(
    patientId: number,
    name: string,
    metricType: 'whoop' | 'medication',
    metricPath: string,
    operator: '<' | '>' | '=' | '<=' | '>=',
    thresholdValue: string,
    priority: 'high' | 'mid' | 'low',
    enabled: boolean = true,
  ): Promise<Alert> {
    return this.request<Alert>('/api/alerts', {
      method: 'POST',
      body: JSON.stringify({
        patientId,
        name,
        metricType,
        metricPath,
        operator,
        thresholdValue,
        priority,
        enabled,
      }),
    });
  }

  async updateAlert(
    alertId: number,
    updates: Partial<{
      name: string;
      metricType: 'whoop' | 'medication';
      metricPath: string;
      operator: '<' | '>' | '=' | '<=' | '>=';
      thresholdValue: string;
      priority: 'high' | 'mid' | 'low';
      enabled: boolean;
    }>,
  ): Promise<Alert> {
    return this.request<Alert>(`/api/alerts/${alertId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteAlert(alertId: number): Promise<void> {
    await this.request(`/api/alerts/${alertId}`, {
      method: 'DELETE',
    });
  }

  async dismissAlert(alertId: number): Promise<void> {
    await this.request(`/api/alerts/${alertId}/dismiss`, {
      method: 'POST',
    });
  }

  async getWhoopStatus(): Promise<WhoopStatus> {
    try {
      return await this.request<WhoopStatus>('/api/integrations/whoop/status');
    } catch (error: any) {
      if (error.message.includes('404') || error.message.includes('401')) {
        return {connected: false};
      }
      throw error;
    }
  }

  async getWhoopConnectUrl(): Promise<{url: string}> {
    return this.request<{url: string}>('/api/integrations/whoop/connect-url');
  }

  async disconnectWhoop(): Promise<void> {
    await this.request('/api/integrations/whoop/disconnect', {
      method: 'DELETE',
    });
  }

  async getWhoopMetrics(): Promise<WhoopMetricsResponse> {
    return this.request<WhoopMetricsResponse>(
      '/api/integrations/whoop/metrics',
    );
  }

  async getHeartRate(): Promise<HeartRateResponse> {
    return this.request<HeartRateResponse>('/api/heart-rate');
  }
}

export const apiService = ApiService.getInstance();
