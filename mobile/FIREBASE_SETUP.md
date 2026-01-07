# Firebase Push Notifications Setup Guide

## Prerequisites

1. Firebase account (https://console.firebase.google.com/)
2. Firebase project created

## Backend Setup

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save the JSON file
4. Set environment variable:
   ```bash
   export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
   ```
   Or set it to the file path:
   ```bash
   export FIREBASE_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json
   ```

## Android Setup

1. In Firebase Console, add Android app:
   - Package name: `com.healthpuck`
   - Download `google-services.json`
2. Copy `google-services.json` to `mobile/android/app/`
3. Rebuild the app:
   ```bash
   cd mobile/android
   ./gradlew clean
   cd ../..
   npm run android
   ```

## iOS Setup

1. In Firebase Console, add iOS app:
   - Bundle ID: Check `mobile/ios/Healthpuck/Info.plist` for `CFBundleIdentifier`
   - Download `GoogleService-Info.plist`
2. Copy `GoogleService-Info.plist` to `mobile/ios/Healthpuck/`
3. Open Xcode project and ensure the file is added to the target
4. Install pods:
   ```bash
   cd mobile/ios
   pod install
   cd ../..
   ```
5. Rebuild the app:
   ```bash
   npm run ios
   ```

## Testing

1. Ensure backend has `FIREBASE_SERVICE_ACCOUNT_KEY` set
2. Run backend server
3. Create an alert that will trigger
4. Wait for alert to trigger (check backend logs)
5. Verify notification appears on device

## Troubleshooting

- **No notifications received**: Check backend logs for FCM errors
- **Token registration fails**: Verify Firebase config files are in correct locations
- **iOS notifications not working**: Ensure APNs certificates are configured in Firebase Console
- **Android build fails**: Verify `google-services.json` is in `android/app/` directory
