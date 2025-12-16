# iOS Setup Status

## ✅ Completed Steps

1. ✅ **Node.js installed** - v25.2.1 via Homebrew
2. ✅ **npm dependencies installed** - All React Native packages installed
3. ✅ **Xcode project generated** - Healthpuck.xcodeproj created
4. ✅ **Info.plist configured** - Bluetooth permissions added

## ⏳ Remaining Steps (Require Your Password)

You need to run these commands that require administrator privileges:

### Option 1: Run the automated script (Recommended)

```bash
cd /Users/tomas/repos/Healthpuck/mobile/ios
./run-sudo-setup.sh
```

This will:
- Configure Xcode to use full Xcode.app
- Install CocoaPods

### Option 2: Run commands manually

```bash
# Configure Xcode
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# Install CocoaPods
sudo gem install cocoapods
```

## After Sudo Setup

Once CocoaPods is installed, run:

```bash
cd /Users/tomas/repos/Healthpuck/mobile/ios
./complete-setup.sh
```

This will install all CocoaPods dependencies and create the workspace.

## Final Steps in Xcode

After `complete-setup.sh` finishes:

1. **Open Xcode workspace:**
   ```bash
   cd /Users/tomas/repos/Healthpuck/mobile/ios
   open Healthpuck.xcworkspace
   ```

2. **Configure in Xcode:**
   - Select `Healthpuck` target
   - Go to "Signing & Capabilities" tab
   - Set Bundle Identifier: `com.healthpuck.app`
   - Select your Team (sign in with Apple ID if needed)
   - Set iOS Deployment Target: `13.4` or higher
   - Click "+ Capability" → Add "Background Modes"
   - Check "Uses Bluetooth LE accessories"

3. **Build and run:**
   ```bash
   cd /Users/tomas/repos/Healthpuck/mobile
   npm run ios
   ```

## Quick Command Summary

```bash
# 1. Run sudo setup (requires password)
cd /Users/tomas/repos/Healthpuck/mobile/ios
./run-sudo-setup.sh

# 2. Complete setup
./complete-setup.sh

# 3. Open in Xcode
open Healthpuck.xcworkspace

# 4. Configure signing in Xcode (see above)

# 5. Run the app
cd /Users/tomas/repos/Healthpuck/mobile
npm run ios
```

