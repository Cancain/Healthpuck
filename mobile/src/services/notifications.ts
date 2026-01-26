import {
  getMessaging,
  requestPermission,
  getToken,
  deleteToken,
  setBackgroundMessageHandler,
  onNotificationOpenedApp,
  getInitialNotification,
  onMessage,
  onTokenRefresh,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import {Platform, Alert} from 'react-native';
import {apiService} from './api';

export interface NotificationPreferences {
  id: number;
  userId: number;
  alertsEnabled: boolean;
  highPriorityEnabled: boolean;
  midPriorityEnabled: boolean;
  lowPriorityEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

class NotificationService {
  private tokenRegistered = false;

  async requestPermissions(): Promise<boolean> {
    try {
      const messaging = getMessaging();
      const authStatus = await requestPermission(messaging);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('[Notifications] Permission granted');
        return true;
      } else {
        console.log('[Notifications] Permission denied');
        return false;
      }
    } catch (error) {
      console.error('[Notifications] Error requesting permissions:', error);
      return false;
    }
  }

  async registerToken(): Promise<void> {
    try {
      if (this.tokenRegistered) {
        return;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log(
          '[Notifications] No permission, skipping token registration',
        );
        return;
      }

      const messaging = getMessaging();
      const token = await getToken(messaging);
      if (!token) {
        console.log('[Notifications] No FCM token available');
        return;
      }

      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      await apiService.registerDeviceToken(token, platform);
      this.tokenRegistered = true;
      console.log('[Notifications] Token registered successfully');

      onTokenRefresh(messaging, async newToken => {
        console.log('[Notifications] Token refreshed');
        await apiService.registerDeviceToken(newToken, platform);
      });
    } catch (error) {
      console.error('[Notifications] Error registering token:', error);
    }
  }

  async unregisterToken(): Promise<void> {
    try {
      const messaging = getMessaging();
      const token = await getToken(messaging);
      if (token) {
        try {
          await apiService.unregisterDeviceToken();
        } catch (error: any) {
          if (
            error.message?.includes('Authentication failed') ||
            error.message?.includes('Network') ||
            error.message?.includes('Connection') ||
            error.name === 'NetworkError' ||
            error.name === 'ConnectionError'
          ) {
            console.log(
              '[Notifications] Token unregister skipped (user logged out or network unavailable)',
            );
          } else {
            throw error;
          }
        }
        await deleteToken(messaging);
        this.tokenRegistered = false;
        console.log('[Notifications] Token unregistered');
      }
    } catch (error) {
      console.error('[Notifications] Error unregistering token:', error);
    }
  }

  private navigationRef: any = null;

  setNavigationRef(ref: any): void {
    this.navigationRef = ref;
  }

  setupNotificationHandlers(): void {
    const messaging = getMessaging();

    setBackgroundMessageHandler(messaging, async remoteMessage => {
      console.log(
        '[Notifications] Background message received:',
        remoteMessage,
      );
    });

    onNotificationOpenedApp(messaging, remoteMessage => {
      console.log('[Notifications] Notification opened app:', remoteMessage);
      this.handleNotificationNavigation(remoteMessage);
    });

    getInitialNotification(messaging).then(remoteMessage => {
      if (remoteMessage) {
        console.log(
          '[Notifications] App opened from notification:',
          remoteMessage,
        );
        setTimeout(() => {
          this.handleNotificationNavigation(remoteMessage);
        }, 1000);
      }
    });

    onMessage(messaging, async remoteMessage => {
      console.log(
        '[Notifications] Foreground message received:',
        remoteMessage,
      );
      const notification = remoteMessage.notification;
      if (notification) {
        Alert.alert(notification.title || 'Varning', notification.body || '', [
          {
            text: 'Visa',
            onPress: () => {
              this.handleNotificationNavigation(remoteMessage);
            },
          },
          {text: 'Stäng', style: 'cancel'},
        ]);
      }
    });
  }

  private handleNotificationNavigation(remoteMessage: any): void {
    if (!this.navigationRef) {
      return;
    }

    const data = remoteMessage.data;
    if (data?.type === 'alert') {
      try {
        this.navigationRef.navigate(
          'Main' as never,
          {
            screen: 'Dashboard',
          } as never,
        );
      } catch (error) {
        console.error('[Notifications] Navigation error:', error);
      }
    }
  }

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    return apiService.getNotificationPreferences();
  }

  async updateNotificationPreferences(
    preferences: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    return apiService.updateNotificationPreferences(preferences);
  }
}

export const notificationService = new NotificationService();
