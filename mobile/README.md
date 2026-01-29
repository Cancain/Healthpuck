# Healthpuck Mobile App

React Native app (Android & iOS) for patients and caregivers: heart rate (Bluetooth/Whoop), medications, alerts, panic button, organisation management, and push notifications. Requires internet for API and FCM.

## Features

- **Patient / Caregiver roles**: Patient dashboard (heart rate, medications, check-ins, panic button); caregiver dashboard (organisation patients, real-time heart rate, active alerts, panic acknowledge)
- **Bluetooth Low Energy (BLE)** heart rate monitoring (patients only); background monitoring when app is backgrounded or screen is locked
- **Real-time heart rate** upload to backend and WebSocket sharing with caregivers
- **Push notifications** (Firebase Cloud Messaging) for alerts and panic alarms
- **Panic button**: Patients trigger alarm (FCM to caregivers); caregivers see flashing row and can acknowledge
- **Organisation management** (caregivers): Patients list, caregivers list, organisation settings; invite users
- **Medications & check-ins**, **alerts**, **Whoop** integration (OAuth, metrics)
- **Settings**: Tabbed (Organisation, Mediciner, Varningar, Whoop, Notifikationer); Font Awesome icons
- User authentication (JWT in Keychain)

## Setup

### Prerequisites

**Common:**

- Node.js 18+
- React Native CLI

**Android:**

- Android Studio with Android SDK
- Android device or emulator with Bluetooth support

**iOS (macOS only):**

- macOS with Xcode installed
- CocoaPods (`sudo gem install cocoapods`)
- Apple Developer Account (free account works for development; required for push/APNs on device)

**Push notifications (optional):** Firebase (FCM). See repo root `FIREBASE_SETUP_GUIDE.md` and add `GoogleService-Info.plist` (iOS) / `google-services.json` (Android) as needed.

### Installation

1. Install dependencies:

```bash
cd mobile
npm install
```

2. For iOS, install CocoaPods dependencies:

```bash
cd ios
pod install
```

3. For Android, clean build:

```bash
cd android
./gradlew clean
```

3. Configure API URL in `src/config.ts`: set the dev URL (e.g. your machine’s LAN IP and port 3001) and production URL as needed; the app uses `__DEV__` to switch.

### Running

1. Start Metro bundler:

```bash
npm start
```

2. Run on Android or iOS:

```bash
npm run android  # For Android
npm run ios       # For iOS (macOS only)
```

## Platform Permissions

### Android Permissions

- Bluetooth and Bluetooth Admin
- Bluetooth Scan and Connect (Android 12+)
- Location (required for BLE scanning)
- Foreground Service
- Wake Lock (for background monitoring)

### iOS Permissions

- Bluetooth Always (`NSBluetoothAlwaysUsageDescription`)
- Bluetooth Peripheral (legacy, iOS 12 and earlier)
- Background Modes: Bluetooth LE accessories (`bluetooth-central`)

## Background Monitoring

The app continues monitoring heart rate when:

- The app is backgrounded
- The screen is locked
- The device goes to sleep

**Android**: Uses a foreground service with persistent notification.

**iOS**: Uses `bluetooth-central` background mode (configured in Info.plist). Note: iOS may suspend background BLE if the app is killed by the system.

## Development

### Project Structure

```
mobile/
├── android/          # Android native code (Gradle, FCM, permissions)
├── ios/              # iOS native code (Xcode, CocoaPods, FCM)
├── src/
│   ├── components/   # AlertCard, HeartRateCard, TabBarIcons, etc.
│   ├── contexts/     # AuthContext, PatientContext
│   ├── navigation/   # AppNavigator, types
│   ├── screens/      # Dashboard, CaregiverDashboard, Settings, Login, Register, Onboarding
│   │   └── settings/ # OrganisationSettings, MedicationsSettings, AlertsSettings, WhoopSettings, NotificationSettings
│   ├── services/     # api, auth, bluetooth, backgroundService, notifications
│   ├── types/        # API types
│   ├── utils/        # theme
│   └── config.ts     # API_BASE_URL (dev/prod), API_ENDPOINTS
└── index.js          # Entry point
```

### Key Services

- `auth.ts` - Authentication, login/register, JWT in Keychain
- `api.ts` - Backend API client (patients, organisations, panic, medications, alerts, heart rate, etc.)
- `bluetooth.ts` - BLE device connection and heart rate monitoring (patients only)
- `backgroundService.ts` - Platform-specific background monitoring (Android foreground service, iOS bluetooth-central)
- `notifications.ts` - FCM token, permissions, foreground/background handling

## Troubleshooting

### Bluetooth not working

- Ensure Bluetooth is enabled on device
- Grant location permission (required for BLE scanning)
- Check device compatibility with BLE

### Background monitoring stops

- Check battery optimization settings
- Ensure foreground service notification is visible
- Verify wake lock permissions

### API connection issues

- Verify API_BASE_URL in config.ts
- Check network connectivity
- Review backend CORS settings

## iOS Setup

See **`ios/README.md`** for full iOS setup (Xcode, CocoaPods, signing, Bluetooth, push). For Firebase/push setup see the repo root **`FIREBASE_SETUP_GUIDE.md`**.

Quick iOS setup:

1. Install CocoaPods: `sudo gem install cocoapods`
2. Install pods: `cd ios && pod install`
3. Open workspace: `open ios/Healthpuck.xcworkspace`
4. Configure signing and capabilities in Xcode; add Push Notifications capability and `GoogleService-Info.plist` for FCM
5. Run: `npm run ios`
