import {NativeModules, Platform} from 'react-native';

const {HeartRateForegroundService} = NativeModules as {
  HeartRateForegroundService?: {
    startService(): Promise<void>;
    stopService(): Promise<void>;
    updateNotification(heartRate: string): Promise<void>;
    isServiceRunning(): Promise<boolean>;
  };
};

export interface BackgroundServiceInterface {
  startService(): Promise<void>;
  stopService(): Promise<void>;
  updateNotification(heartRate: string): Promise<void>;
  isServiceRunning(): Promise<boolean>;
}

class BackgroundService implements BackgroundServiceInterface {
  private isIOSBackgroundActive: boolean = false;

  async startService(): Promise<void> {
    if (Platform.OS === 'ios') {
      // iOS handles background BLE through UIBackgroundModes (bluetooth-central)
      // The app must be configured in Info.plist with bluetooth-central background mode
      // BLE will continue to work in background automatically if properly configured
      this.isIOSBackgroundActive = true;
      console.log(
        'iOS background BLE monitoring enabled (configured via Info.plist)',
      );
      return;
    }

    if (Platform.OS !== 'android') {
      console.warn('Background service only available on Android and iOS');
      return;
    }

    if (!HeartRateForegroundService) {
      console.warn('HeartRateForegroundService native module not available');
      return;
    }

    try {
      await HeartRateForegroundService.startService();
      console.log('Background service started');
    } catch (error) {
      console.error('Failed to start background service:', error);
      throw error;
    }
  }

  async stopService(): Promise<void> {
    if (Platform.OS === 'ios') {
      this.isIOSBackgroundActive = false;
      console.log('iOS background BLE monitoring disabled');
      return;
    }

    if (Platform.OS !== 'android' || !HeartRateForegroundService) {
      return;
    }

    try {
      await HeartRateForegroundService.stopService();
      console.log('Background service stopped');
    } catch (error) {
      console.error('Failed to stop background service:', error);
    }
  }

  async updateNotification(heartRate: string): Promise<void> {
    if (Platform.OS === 'ios') {
      // iOS doesn't use foreground service notifications like Android
      // Background BLE continues automatically, but we can't update notifications
      // Consider using local notifications if needed
      return;
    }

    if (Platform.OS !== 'android' || !HeartRateForegroundService) {
      return;
    }

    try {
      await HeartRateForegroundService.updateNotification(heartRate);
    } catch (error) {
      console.error('Failed to update notification:', error);
    }
  }

  async isServiceRunning(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return this.isIOSBackgroundActive;
    }

    if (Platform.OS !== 'android' || !HeartRateForegroundService) {
      return false;
    }

    try {
      return await HeartRateForegroundService.isServiceRunning();
    } catch (error) {
      console.error('Failed to check service status:', error);
      return false;
    }
  }
}

export const backgroundService = new BackgroundService();
