# iOS Quick Start Guide

Quick reference for compiling the iOS app on macOS.

**👋 Never used Xcode before?** See [`FRIDAY_SETUP_GUIDE.md`](FRIDAY_SETUP_GUIDE.md) for detailed beginner-friendly instructions!

## Prerequisites Checklist

- [ ] macOS computer
- [ ] Xcode installed (from Mac App Store)
- [ ] Apple Developer Account (free account works)
- [ ] Node.js 18+ installed
- [ ] CocoaPods installed (`sudo gem install cocoapods`)

## Setup Steps

1. **Run setup script**:

   ```bash
   cd mobile/ios
   ./setup-ios.sh
   ```

2. **Open in Xcode**:

   ```bash
   open Healthpuck.xcworkspace
   ```

   ⚠️ Always use `.xcworkspace`, not `.xcodeproj`

3. **Configure in Xcode**:
   - Select `Healthpuck` target
   - "Signing & Capabilities" tab:
     - Bundle ID: `com.healthpuck.app`
     - Select your Team
     - iOS Deployment Target: `13.4`
   - Add "Background Modes" capability
   - Check "Uses Bluetooth LE accessories"

4. **Run the app**:
   ```bash
   cd mobile
   npm run ios
   ```

## Common Commands

```bash
# Install pods
cd ios && pod install

# Run on simulator
npm run ios

# Run on device
npm run ios -- --device

# Clean build
# In Xcode: Product → Clean Build Folder (Shift+Cmd+K)
```

## Troubleshooting

- **"No such module 'React'"** → Open `.xcworkspace`, not `.xcodeproj`
- **Signing errors** → Select Team in "Signing & Capabilities"
- **Pod install fails** → Run `pod install --repo-update`
- **Build fails** → Clean build folder and DerivedData

For detailed troubleshooting, see `README.md`.
