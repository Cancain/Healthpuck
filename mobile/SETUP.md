# Healthpuck Mobile App - Setup Guide

## Quick Start

1. **Install Dependencies**

   ```bash
   cd mobile
   npm install
   ```

2. **Configure API URL**
   - Edit `src/config.ts`
   - For Android emulator: `http://10.0.2.2:3001` (already set)
   - For physical device: Use your computer's IP (e.g., `http://192.168.1.100:3001`)
   - For production: Your production API URL

3. **Start Backend**

   ```bash
   cd ../backend
   npm run dev
   ```

4. **Run Mobile App**
   ```bash
   cd mobile
   npm start
   # In another terminal:
   npm run android  # For Android
   # OR
   npm run ios       # For iOS (macOS only)
   ```

## Android Setup

### Prerequisites

- Android Studio installed
- Android SDK (API 24+)
- Android device or emulator with Bluetooth support

### First Time Setup

1. Open Android Studio
2. Open `mobile/android` folder
3. Let Gradle sync complete
4. Connect Android device or start emulator

### Building

```bash
cd mobile/android
./gradlew assembleDebug
```

## iOS Setup

### Prerequisites

- **macOS** (required for iOS development)
- **Xcode** (latest version from Mac App Store)
- **CocoaPods** - Install with: `sudo gem install cocoapods`
- **Apple Developer Account** (free account works for development)

### First Time Setup

1. **Install CocoaPods** (if not already installed):

   ```bash
   sudo gem install cocoapods
   ```

2. **Generate Xcode Project** (run on macOS):

   ```bash
   cd mobile
   npx react-native init Healthpuck --skip-install --directory temp_ios
   cp -r temp_ios/ios/* ios/
   rm -rf temp_ios
   ```

3. **Install CocoaPods Dependencies**:

   ```bash
   cd ios
   pod install
   ```

4. **Open in Xcode**:

   ```bash
   open Healthpuck.xcworkspace
   ```

   **Important**: Always open `.xcworkspace`, not `.xcodeproj` when using CocoaPods.

5. **Configure Xcode**:
   - Select the `Healthpuck` target
   - Go to "Signing & Capabilities" tab
   - Set Bundle Identifier to: `com.healthpuck.app`
   - Select your Team (Apple Developer account)
   - Set "iOS Deployment Target" to `13.4` or higher
   - Add "Background Modes" capability
   - Check "Uses Bluetooth LE accessories" (enables `bluetooth-central` background mode)

### Building

**Run on iOS Simulator**:

```bash
cd mobile
npm run ios
```

**Run on Physical Device**:

```bash
npm run ios -- --device
```

**Build for Release** (in Xcode):

1. Select "Any iOS Device" as target
2. Product → Archive
3. Follow the Archive organizer to distribute

### iOS-Specific Notes

- Background BLE on iOS uses `bluetooth-central` background mode (configured in Info.plist)
- iOS may suspend background BLE if the app is killed by the system
- Bluetooth permissions are requested at runtime (handled by react-native-ble-manager)
- See `ios/README.md` for detailed iOS setup and troubleshooting

## Features Implemented

✅ **Authentication**

- Login with email/password
- JWT token storage
- Auto-login on app restart

✅ **Bluetooth**

- BLE device scanning
- Whoop device connection
- Heart rate monitoring
- Automatic reconnection

✅ **Background Monitoring**

- **Android**: Foreground service with notification
- **iOS**: Background BLE mode (`bluetooth-central`)
- Continues when app is backgrounded
- Continues when screen is locked
- Platform-specific implementations

✅ **Data Upload**

- Real-time heart rate upload to backend
- Offline queue for failed uploads
- Automatic retry when connection restored

✅ **UI**

- Login screen
- Device scanning and connection
- Real-time heart rate display
- Connection status indicator
- Upload queue status

## Troubleshooting

### Bluetooth Issues

- **Permission Denied**: Grant location permission (required for BLE scanning on Android 6.0+)
- **Device Not Found**: Ensure Whoop device is powered on and nearby
- **Connection Failed**: Try disconnecting and reconnecting

### Background Monitoring Stops

- **Battery Optimization**: Disable battery optimization for the app in Android settings
- **Doze Mode**: The app uses wake locks, but Android may still limit background activity
- **Foreground Service**: Ensure notification is visible (required for foreground service)

### API Connection Issues

- **Network Error**: Check API_BASE_URL in `src/config.ts`
- **CORS Error**: Ensure backend CORS allows your device's origin
- **401 Unauthorized**: Token may have expired, try logging out and back in

### Build Issues

**Android:**

- **Gradle Sync Failed**: Update Android Studio and SDK
- **Missing Dependencies**: Run `npm install` in mobile directory
- **Native Module Not Found**: Rebuild the app after adding native modules

**iOS:**

- **CocoaPods Issues**: Update CocoaPods with `sudo gem install cocoapods`, then run `pod install` again
- **"No such module 'React'"**: Make sure you opened `.xcworkspace`, not `.xcodeproj`
- **Signing Errors**: Select your Team in "Signing & Capabilities" tab in Xcode
- **Command PhaseScriptExecution failed**: Clean build folder (Shift+Cmd+K) and delete DerivedData
- See `ios/README.md` for detailed iOS troubleshooting

## Testing

### Test Scenarios

1. **Login**: Verify authentication works
2. **Device Scan**: Find Whoop devices
3. **Connection**: Connect to device
4. **Heart Rate**: Verify readings are received
5. **Background**: Background app and verify monitoring continues
6. **Screen Lock**: Lock screen and verify monitoring continues
7. **Upload**: Verify data appears in backend database

### Manual Testing Checklist

- [ ] Login with valid credentials
- [ ] Scan for Bluetooth devices
- [ ] Connect to Whoop device
- [ ] Start monitoring and see heart rate
- [ ] Background app - monitoring continues
- [ ] Lock screen - monitoring continues
- [ ] Check backend database for uploaded readings
- [ ] Test offline mode (airplane mode) - readings queued
- [ ] Reconnect network - queued readings upload

## Architecture

### Services

- `auth.ts`: Authentication and user management
- `api.ts`: Backend API client with offline queue
- `bluetooth.ts`: BLE device management and heart rate monitoring
- `backgroundService.ts`: Platform-specific background service (Android foreground service, iOS background BLE)

### Screens

- `Login.tsx`: User authentication
- `Monitor.tsx`: Main monitoring interface

### Native Modules

- `HeartRateForegroundService`: Android foreground service
- `HeartRateForegroundServiceModule`: React Native bridge

## Next Steps

1. ✅ iOS support (configured with BLE background modes)
2. Add historical data visualization
3. Add push notifications for alerts
4. Add device battery level monitoring
5. Add multiple device support
