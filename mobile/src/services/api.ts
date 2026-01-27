import {API_BASE_URL, API_ENDPOINTS} from '../config';
import {authService} from './auth';
import {getMessaging, getToken} from '@react-native-firebase/messaging';
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
          await authService.logout();
          throw new Error('Authentication failed');
        }

        if (response.status === 429) {
          this.offlineQueue.push(reading);
          throw new Error('Rate limited');
        }

        const error = await response
          .json()
          .catch(() => ({error: 'Upload failed'}));
        throw new Error(error.error || 'Upload failed');
      }

      const data: HeartRateResponse = await response.json();

      await this.processOfflineQueue();

      return data;
    } catch (error: any) {
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
    try {
      const headers = await this.getAuthHeaders();
      const url = `${API_BASE_URL}${endpoint}`;

      const response = await fetch(url, {
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
        let errorMessage = 'Request failed';
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || 'Request failed';
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error: any) {
      if (
        error.message === 'Network request failed' ||
        error.message?.includes('Network')
      ) {
        const networkError = new Error(
          `Network error: Unable to connect to ${API_BASE_URL}. Please check your internet connection and ensure the backend server is running.`,
        );
        networkError.name = 'NetworkError';
        throw networkError;
      }
      if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        const fetchError = new Error(
          `Connection error: Could not reach ${API_BASE_URL}. Please verify the backend URL is correct and the server is running.`,
        );
        fetchError.name = 'ConnectionError';
        throw fetchError;
      }
      throw error;
    }
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

  async getAlerts(patientId?: number): Promise<Alert[]> {
    const url = patientId ? `/api/alerts?patientId=${patientId}` : '/api/alerts';
    return this.request<Alert[]>(url);
  }

  async getActiveAlerts(patientId?: number): Promise<ActiveAlert[]> {
    const query = patientId ? `?patientId=${patientId}` : '';
    return this.request<ActiveAlert[]>(`/api/alerts/active${query}`);
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
    return this.request<{url: string}>(
      '/api/integrations/whoop/connect-url?platform=mobile',
    );
  }

  async exchangeWhoopCode(
    code: string,
    state: string,
    redirectUri?: string,
  ): Promise<void> {
    return this.request<void>('/api/integrations/whoop/exchange-code', {
      method: 'POST',
      body: JSON.stringify({code, state, redirect_uri: redirectUri}),
    });
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

  async getHeartRate(patientId?: number): Promise<HeartRateResponse> {
    const query = patientId ? `?patientId=${patientId}` : '';
    return this.request<HeartRateResponse>(`/api/heart-rate${query}`);
  }

  async registerDeviceToken(
    token: string,
    platform: 'ios' | 'android',
  ): Promise<{success: boolean; message: string}> {
    return this.request<{success: boolean; message: string}>(
      '/api/notifications/register',
      {
        method: 'POST',
        body: JSON.stringify({token, platform}),
      },
    );
  }

  async unregisterDeviceToken(): Promise<{success: boolean; message: string}> {
    const token = await this.getFCMToken();
    if (!token) {
      throw new Error('No FCM token available');
    }
    return this.request<{success: boolean; message: string}>(
      '/api/notifications/unregister',
      {
        method: 'DELETE',
        body: JSON.stringify({token}),
      },
    );
  }

  private async getFCMToken(): Promise<string | null> {
    try {
      const messaging = getMessaging();
      return await getToken(messaging);
    } catch {
      return null;
    }
  }

  async getNotificationPreferences(): Promise<{
    id: number;
    userId: number;
    alertsEnabled: boolean;
    highPriorityEnabled: boolean;
    midPriorityEnabled: boolean;
    lowPriorityEnabled: boolean;
    createdAt: string;
    updatedAt: string;
  }> {
    return this.request('/api/notifications/preferences');
  }

  async updateNotificationPreferences(preferences: {
    alertsEnabled?: boolean;
    highPriorityEnabled?: boolean;
    midPriorityEnabled?: boolean;
    lowPriorityEnabled?: boolean;
  }): Promise<{
    id: number;
    userId: number;
    alertsEnabled: boolean;
    highPriorityEnabled: boolean;
    midPriorityEnabled: boolean;
    lowPriorityEnabled: boolean;
    createdAt: string;
    updatedAt: string;
  }> {
    return this.request('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  async sendTestNotification(delaySeconds: number = 0): Promise<{
    success: boolean;
    message: string;
    sent?: number;
    failed?: number;
    scheduled?: boolean;
    delaySeconds?: number;
  }> {
    try {
      return await this.request<{
        success: boolean;
        message: string;
        sent?: number;
        failed?: number;
        scheduled?: boolean;
        delaySeconds?: number;
      }>('/api/notifications/test', {
        method: 'POST',
        body: JSON.stringify({delay: delaySeconds}),
      });
    } catch (error: any) {
      if (error.message?.includes('Firebase not configured')) {
        throw new Error(
          'Firebase is not configured on the backend. Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable. See FIREBASE_SETUP_GUIDE.md for setup instructions.',
        );
      }
      throw error;
    }
  }

  async getOrganisation(): Promise<{
    organisationId: number;
    organisationName: string;
  }> {
    return this.request<{
      organisationId: number;
      organisationName: string;
    }>('/api/organisations');
  }

  async createOrganisation(name?: string): Promise<{
    organisationId: number;
    organisationName: string;
  }> {
    return this.request<{
      organisationId: number;
      organisationName: string;
    }>('/api/organisations', {
      method: 'POST',
      body: JSON.stringify({name}),
    });
  }

  async getOrganisationPatients(): Promise<Patient[]> {
    return this.request<Patient[]>('/api/organisations/patients');
  }

  async getPatientAlerts(patientId: number): Promise<ActiveAlert[]> {
    return this.getActiveAlerts(patientId);
  }

  async getPatientHeartRate(patientId: number): Promise<HeartRateResponse> {
    return this.getHeartRate(patientId);
  }

  async inviteUsersToOrganisation(invites: Array<{
    email: string;
    name: string;
    password: string;
    role: 'patient' | 'caregiver';
  }>): Promise<{
    created: Array<{id: number; email: string; name: string}>;
    errors: Array<{email: string; error: string}>;
  }> {
    return this.request<{
      created: Array<{id: number; email: string; name: string}>;
      errors: Array<{email: string; error: string}>;
    }>('/api/organisations/invite-users', {
      method: 'POST',
      body: JSON.stringify({invites}),
    });
  }
}

export const apiService = ApiService.getInstance();
