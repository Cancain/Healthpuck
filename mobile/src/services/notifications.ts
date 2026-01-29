import {
  getMessaging,
  requestPermission,
  hasPermission,
  getToken,
  deleteToken,
  onNotificationOpenedApp,
  getInitialNotification,
  onMessage,
  onTokenRefresh,
  AuthorizationStatus,
  registerDeviceForRemoteMessages,
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

  async checkPermissionStatus(): Promise<number> {
    try {
      const messaging = getMessaging();
      const authStatus = await hasPermission(messaging);
      console.log(
        `[Notifications] Current permission status: ${authStatus} (${AuthorizationStatus[authStatus]})`,
      );
      return authStatus;
    } catch (error) {
      console.error('[Notifications] Error checking permission status:', error);
      return AuthorizationStatus.NOT_DETERMINED;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const messaging = getMessaging();
      const authStatus = await requestPermission(messaging);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      console.log(
        `[Notifications] Permission status: ${authStatus} (${AuthorizationStatus[authStatus]})`,
      );
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
      const permissionGranted = await this.requestPermissions();
      if (!permissionGranted) {
        console.log(
          '[Notifications] No permission, skipping token registration',
        );
        return;
      }

      const messaging = getMessaging();
      
      // On iOS, explicitly register device for remote messages before getting token
      // Auto-registration may not be enabled, so we need to do this manually
      if (Platform.OS === 'ios') {
        try {
          await registerDeviceForRemoteMessages(messaging);
          console.log('[Notifications] Device registered for remote messages (iOS)');
        } catch (error: any) {
          const errorMsg = error.message || String(error);
          // If already registered, that's fine - continue
          if (errorMsg.includes('already registered')) {
            console.log('[Notifications] Device already registered for remote messages');
          } else {
            // For other errors, log but continue - getToken might still work
            console.warn('[Notifications] Warning during device registration:', errorMsg);
          }
        }
      }
      
      const token = await getToken(messaging);
      if (!token) {
        console.log('[Notifications] No FCM token available');
        return;
      }

      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      await apiService.registerDeviceToken(token, platform);
      this.tokenRegistered = true;
      console.log(
        '[Notifications] Token registered successfully:',
        token.substring(0, 20) + '...',
      );

      onTokenRefresh(messaging, async newToken => {
        console.log('[Notifications] Token refreshed, re-registering...');
        this.tokenRegistered = false;
        await apiService.registerDeviceToken(newToken, platform);
        this.tokenRegistered = true;
        console.log(
          '[Notifications] New token registered:',
          newToken.substring(0, 20) + '...',
        );
      });
    } catch (error) {
      console.error('[Notifications] Error registering token:', error);
      this.tokenRegistered = false;
    }
  }

  async unregisterToken(): Promise<void> {
    try {
      const messaging = getMessaging();
      
      // On iOS, check if device is registered before trying to get token
      let token: string | null = null;
      if (Platform.OS === 'ios') {
        try {
          // Try to get token, but don't fail if device isn't registered
          token = await getToken(messaging);
        } catch (error: any) {
          if (error.message?.includes('not registered') || error.message?.includes('unregistered')) {
            console.log('[Notifications] Device not registered for remote messages, skipping token deletion');
            return;
          }
          throw error;
        }
      } else {
        token = await getToken(messaging);
      }
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
