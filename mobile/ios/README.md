# iOS Setup Guide

This guide will help you set up the iOS project for compilation on macOS.

**👋 New to Xcode?** Start with [`FRIDAY_SETUP_GUIDE.md`](FRIDAY_SETUP_GUIDE.md) - a complete step-by-step guide for beginners!

## Prerequisites

1. **macOS** (required for iOS development)
2. **Xcode** (latest version from Mac App Store)
3. **CocoaPods** - Install with: `sudo gem install cocoapods`
4. **Node.js 18+** - Already installed for React Native
5. **Apple Developer Account** - Required for signing and building

## Initial Setup

### Quick Setup (Automated)

Run the setup script on macOS:

```bash
cd mobile/ios
./setup-ios.sh
```

This script will:

- Check/install CocoaPods
- Generate the Xcode project structure
- Install all CocoaPods dependencies

### Manual Setup

If you prefer to set up manually:

#### 1. Install CocoaPods (if not already installed)

```bash
sudo gem install cocoapods
```

#### 2. Generate Xcode Project

Since the iOS project structure needs to be generated on macOS, run this command in the `mobile` directory:

```bash
cd mobile
npx react-native init Healthpuck --skip-install --directory temp_ios
cp -r temp_ios/ios/* ios/
rm -rf temp_ios
```

**OR** if you prefer to use the React Native CLI directly:

```bash
cd mobile
npx @react-native-community/cli init Healthpuck --skip-install --directory temp_ios
cp -r temp_ios/ios/* ios/
rm -rf temp_ios
```

#### 3. Install CocoaPods Dependencies

```bash
cd ios
pod install
```

This will:

- Install all native dependencies (react-native-ble-manager, react-native-keychain, etc.)
- Create the `Healthpuck.xcworkspace` file (use this, not `.xcodeproj`)

### 4. Open in Xcode

```bash
open Healthpuck.xcworkspace
```

**Important**: Always open `.xcworkspace`, not `.xcodeproj` when using CocoaPods.

## Xcode Configuration

### 1. Set Bundle Identifier

1. Select the `Healthpuck` project in the navigator
2. Select the `Healthpuck` target
3. Go to "Signing & Capabilities" tab
4. Set Bundle Identifier to: `com.healthpuck.app`
5. Select your Team (Apple Developer account)

### 2. Configure Deployment Target

1. Select the `Healthpuck` target
2. Go to "General" tab
3. Set "iOS Deployment Target" to `13.4` or higher (required for BLE support)

### 3. Enable Background Modes

1. Select the `Healthpuck` target
2. Go to "Signing & Capabilities" tab
3. Click "+ Capability"
4. Add "Background Modes"
5. Check "Uses Bluetooth LE accessories" (this enables `bluetooth-central` background mode)

### 4. Verify Info.plist Settings

The `Info.plist` should already contain:

- `NSBluetoothAlwaysUsageDescription` - Bluetooth permission description
- `NSBluetoothPeripheralUsageDescription` - Legacy Bluetooth permission
- `UIBackgroundModes` with `bluetooth-central` entry

Verify these are present in Xcode:

1. Select `Info.plist` in the project navigator
2. Check that all Bluetooth permissions are present
3. Verify `UIBackgroundModes` includes `bluetooth-central`

## Building and Running

### Run on iOS Simulator

```bash
cd mobile
npm run ios
```

Or specify a simulator:

```bash
npm run ios -- --simulator="iPhone 14 Pro"
```

### Run on Physical Device

1. Connect your iPhone via USB
2. Trust the computer on your iPhone
3. In Xcode, select your device from the device dropdown
4. Run: `npm run ios -- --device`

**Note**: You'll need to configure code signing for physical devices:

- Select your Team in "Signing & Capabilities"
- Xcode will automatically create a provisioning profile

### Build for Release

In Xcode:

1. Select "Any iOS Device" or "Generic iOS Device" as target
2. Product → Archive
3. Follow the Archive organizer to distribute

## Troubleshooting

### CocoaPods Issues

**Problem**: `pod install` fails

- **Solution**: Update CocoaPods: `sudo gem install cocoapods`
- Clear CocoaPods cache: `pod cache clean --all`
- Delete `Podfile.lock` and `Pods/` directory, then run `pod install` again

**Problem**: Dependencies not found

- **Solution**: Make sure you're in the `ios` directory when running `pod install`
- Verify `Podfile` references the correct React Native version

### Build Issues

**Problem**: "No such module 'React'"

- **Solution**: Make sure you opened `.xcworkspace`, not `.xcodeproj`
- Run `pod install` again

**Problem**: "Command PhaseScriptExecution failed"

- **Solution**: Clean build folder: Product → Clean Build Folder (Shift+Cmd+K)
- Delete `DerivedData`: `rm -rf ~/Library/Developer/Xcode/DerivedData`

**Problem**: Signing errors

- **Solution**:
  - Select your Team in "Signing & Capabilities"
  - Ensure Bundle Identifier matches your provisioning profile
  - For development, Xcode can automatically manage signing

### Bluetooth Issues

**Problem**: Bluetooth permission not requested

- **Solution**: Verify `NSBluetoothAlwaysUsageDescription` is in `Info.plist`
- Check that the app has Bluetooth permission in iOS Settings

**Problem**: Background BLE stops working

- **Solution**:
  - Verify `UIBackgroundModes` includes `bluetooth-central` in `Info.plist`
  - Enable "Uses Bluetooth LE accessories" capability in Xcode
  - Note: iOS may suspend background BLE if the app is killed by the system

**Problem**: Can't find BLE devices

- **Solution**:
  - Ensure Bluetooth is enabled on the device
  - Grant Bluetooth permission when prompted
  - For iOS 13+, location permission may also be required for BLE scanning

### Metro Bundler Issues

**Problem**: Metro bundler not starting

- **Solution**:
  - Kill any existing Metro processes: `killall node`
  - Clear Metro cache: `npm start -- --reset-cache`
  - Ensure port 8081 is not in use

## Project Structure

```
ios/
├── Healthpuck/              # Main app directory
│   ├── AppDelegate.h       # App delegate header
│   ├── AppDelegate.mm      # App delegate implementation
│   ├── Info.plist          # App configuration and permissions
│   └── main.m              # App entry point
├── Podfile                 # CocoaPods dependencies
├── Podfile.lock            # Locked dependency versions (generated)
├── Pods/                   # Installed pods (generated, gitignored)
├── Healthpuck.xcodeproj    # Xcode project (generated)
└── Healthpuck.xcworkspace  # Xcode workspace (generated, use this)
```

## Notes

- **Always use `.xcworkspace`** when opening in Xcode (not `.xcodeproj`)
- **Background BLE on iOS** is more restricted than Android - the system may suspend background activity if the app is killed
- **First build** may take 5-10 minutes as CocoaPods downloads dependencies
- **Physical device testing** requires an Apple Developer account (free account works for development)

## Next Steps

After successful setup:

1. Test Bluetooth scanning and connection
2. Verify heart rate monitoring works
3. Test background monitoring (app backgrounded)
4. Verify data uploads to backend
5. Test on physical device (required for real BLE hardware)
