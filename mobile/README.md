# Healthpuck Mobile App

React Native Android app for monitoring heart rate via Bluetooth and uploading data to the backend.

## Features

- Bluetooth Low Energy (BLE) heart rate monitoring
- Background monitoring (continues when app is backgrounded or screen is locked)
- Real-time heart rate upload to backend API
- Offline queue for failed uploads
- User authentication

## Setup

### Prerequisites

- Node.js 18+
- React Native CLI
- Android Studio with Android SDK
- Android device or emulator with Bluetooth support

### Installation

1. Install dependencies:

```bash
cd mobile
npm install
```

2. For Android, install pods (if using CocoaPods):

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

2. Run on Android:

```bash
npm run android
```

## Android Permissions

The app requires the following permissions:

- Bluetooth and Bluetooth Admin
- Bluetooth Scan and Connect (Android 12+)
- Location (required for BLE scanning)
- Foreground Service
- Wake Lock (for background monitoring)

## Background Monitoring

The app uses an Android foreground service to continue monitoring heart rate when:

- The app is backgrounded
- The screen is locked
- The device goes to sleep

A persistent notification is shown while monitoring is active.

## Development

### Project Structure

```
mobile/
├── android/          # Android native code
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
- `backgroundService.ts` - Android foreground service wrapper

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
