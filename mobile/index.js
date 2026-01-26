/**
 * @format
 */

import 'react-native-gesture-handler';
import {AppRegistry, Platform} from 'react-native';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import App from './src/App';
import {name as appName} from './app.json';

const messaging = getMessaging();

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
