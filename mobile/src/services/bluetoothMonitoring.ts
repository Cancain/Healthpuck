import {AppState, AppStateStatus} from 'react-native';
import {bluetoothService} from './bluetooth';
import {backgroundService} from './backgroundService';
import {apiService} from './api';

class BluetoothMonitoringService {
  private isMonitoring: boolean = false;
  private heartRateCallback: ((hr: number) => void) | null = null;
  private connectionCheckInterval: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: any = null;
  private lastHeartRate: number | null = null;
  private lastHeartRateTimestamp: number | null = null;

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('[BluetoothMonitoring] Already monitoring, skipping');
      return;
    }

    try {
      await bluetoothService.initialize();
      const connected = bluetoothService.isConnected();

      console.log(
        `[BluetoothMonitoring] Starting monitoring service, connected=${connected}`,
      );

      if (connected) {
        await this.startHeartRateMonitoring();
      } else {
        console.log(
          '[BluetoothMonitoring] Device not connected, will start when connected',
        );
      }

      this.startConnectionCheck();
      this.setupAppStateListener();
      this.isMonitoring = true;
    } catch (error) {
      console.error('[BluetoothMonitoring] Failed to start monitoring:', error);
      throw error;
    }
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    console.log('[BluetoothMonitoring] Stopping monitoring service');

    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    try {
      if (bluetoothService.isMonitoringActive()) {
        await bluetoothService.stopHeartRateMonitoring();
      }
      await backgroundService.stopService();
    } catch (error) {
      console.error('[BluetoothMonitoring] Error stopping services:', error);
    }

    this.isMonitoring = false;
    this.heartRateCallback = null;
  }

  private async startHeartRateMonitoring(): Promise<void> {
    if (bluetoothService.isMonitoringActive()) {
      console.log('[BluetoothMonitoring] Heart rate monitoring already active');
      return;
    }

    const handleHeartRate = async (hr: number) => {
      console.log(`[BluetoothMonitoring] Heart rate received: ${hr} bpm`);
      this.lastHeartRate = hr;
      this.lastHeartRateTimestamp = Date.now();

      try {
        await backgroundService.updateNotification(`${hr}`);
      } catch (error) {
        console.warn(
          '[BluetoothMonitoring] Failed to update notification:',
          error,
        );
      }

      try {
        await apiService.uploadHeartRate(hr, 'bluetooth');
        console.log(
          `[BluetoothMonitoring] Heart rate uploaded successfully: ${hr} bpm`,
        );
      } catch (error) {
        console.error(
          '[BluetoothMonitoring] Failed to upload heart rate:',
          error,
        );
      }

      if (this.heartRateCallback) {
        this.heartRateCallback(hr);
      }
    };

    try {
      await bluetoothService.startHeartRateMonitoring(handleHeartRate);
      await backgroundService.startService();
      console.log('[BluetoothMonitoring] Heart rate monitoring started');
    } catch (error) {
      console.error(
        '[BluetoothMonitoring] Failed to start heart rate monitoring:',
        error,
      );
      throw error;
    }
  }

  private startConnectionCheck(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    console.log('[BluetoothMonitoring] Starting connection check interval');

    this.connectionCheckInterval = setInterval(() => {
      const connected = bluetoothService.isConnected();
      const currentlyMonitoring = bluetoothService.isMonitoringActive();

      if (connected && !currentlyMonitoring) {
        console.log(
          '[BluetoothMonitoring] Device connected, starting heart rate monitoring',
        );
        this.startHeartRateMonitoring().catch(error => {
          console.error(
            '[BluetoothMonitoring] Error starting monitoring on connect:',
            error,
          );
        });
      } else if (!connected && currentlyMonitoring) {
        console.log(
          '[BluetoothMonitoring] Device disconnected, stopping heart rate monitoring',
        );
        bluetoothService.stopHeartRateMonitoring().catch(() => {});
      }
    }, 2000);
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        console.log(`[BluetoothMonitoring] App state changed: ${nextAppState}`);
        if (nextAppState === 'active' && bluetoothService.isConnected()) {
          if (!bluetoothService.isMonitoringActive()) {
            console.log(
              '[BluetoothMonitoring] App became active, restarting monitoring',
            );
            this.startHeartRateMonitoring().catch(error => {
              console.error(
                '[BluetoothMonitoring] Error restarting monitoring:',
                error,
              );
            });
          }
        }
      },
    );
  }

  setHeartRateCallback(callback: (hr: number) => void): void {
    this.heartRateCallback = callback;
    if (this.lastHeartRate !== null) {
      callback(this.lastHeartRate);
    }
  }

  getLastHeartRate(): number | null {
    return this.lastHeartRate;
  }

  getLastHeartRateTimestamp(): number | null {
    return this.lastHeartRateTimestamp;
  }

  isActive(): boolean {
    return this.isMonitoring;
  }
}

export const bluetoothMonitoringService = new BluetoothMonitoringService();
