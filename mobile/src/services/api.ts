import {API_BASE_URL, API_ENDPOINTS} from '../config';
import {authService} from './auth';

export interface HeartRateReading {
  heartRate: number;
  source: 'bluetooth' | 'api';
}

export interface HeartRateResponse {
  success: boolean;
  heartRate: number;
  timestamp: number;
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
}

export const apiService = ApiService.getInstance();
