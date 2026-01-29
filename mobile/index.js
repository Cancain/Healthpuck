/**
 * @format
 */

import 'react-native-gesture-handler';
import {AppRegistry, Platform} from 'react-native';
import {
  getMessaging,
  setBackgroundMessageHandler,
  registerDeviceForRemoteMessages,
} from '@react-native-firebase/messaging';
import App from './src/App';
import {name as appName} from './app.json';

const messaging = getMessaging();

// On iOS, register device for remote messages at app startup
// This ensures registration happens before any token operations
if (Platform.OS === 'ios') {
  registerDeviceForRemoteMessages(messaging)
    .then(() => {
      console.log('[App] Device registered for remote messages at startup (iOS)');
    })
    .catch(error => {
      // Ignore "already registered" - that's fine
      if (!error.message?.includes('already registered')) {
        console.warn('[App] Warning registering device at startup:', error.message);
      }
    });
}

setBackgroundMessageHandler(messaging, async remoteMessage => {
  console.log(
    `[Notifications] Background message received (${Platform.OS}):`,
    JSON.stringify({
      hasNotification: !!remoteMessage.notification,
      title: remoteMessage.notification?.title,
      body: remoteMessage.notification?.body,
      data: remoteMessage.data,
      messageId: remoteMessage.messageId,
    }),
  );

  if (remoteMessage.notification) {
    console.log(
      `[Notifications] Notification should display automatically: "${remoteMessage.notification.title}"`,
    );
  }

  return Promise.resolve();
});

AppRegistry.registerComponent(appName, () => App);
