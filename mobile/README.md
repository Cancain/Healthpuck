# Healthpuck Mobile App

React Native app (Android & iOS) for monitoring heart rate via Bluetooth and uploading data to the backend.

## Features

- Bluetooth Low Energy (BLE) heart rate monitoring
- Background monitoring (continues when app is backgrounded or screen is locked)
- Real-time heart rate upload to backend API
- Offline queue for failed uploads
- User authentication

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
- Apple Developer Account (free account works for development)

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

3. Update API URL in `src/config.ts`:

```typescript
export const API_BASE_URL = 'http://YOUR_BACKEND_URL:3001';
```

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
├── android/          # Android native code
├── ios/              # iOS native code
├── src/
│   ├── screens/      # UI screens
│   ├── services/     # Business logic services
│   └── config.ts     # Configuration
└── index.js          # Entry point
```

### Key Services

- `auth.ts` - Authentication and user management
- `api.ts` - Backend API client with offline queue
- `bluetooth.ts` - BLE device connection and heart rate monitoring
- `backgroundService.ts` - Platform-specific background service (Android foreground service, iOS background BLE)

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

For detailed iOS setup instructions, see:

- `SETUP.md` - General setup guide with iOS section
- `ios/README.md` - Comprehensive iOS-specific guide

Quick iOS setup:

1. Install CocoaPods: `sudo gem install cocoapods`
2. Generate Xcode project (on macOS): See `SETUP.md` for details
3. Install pods: `cd ios && pod install`
4. Open workspace: `open Healthpuck.xcworkspace`
5. Configure signing and capabilities in Xcode
6. Run: `npm run ios`
