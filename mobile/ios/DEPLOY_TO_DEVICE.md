# Deploy iOS App to Physical Device

## Prerequisites

1. **iPhone connected via USB**
2. **Trust the computer** on your iPhone (if prompted)
3. **Apple Developer Account** (free account works for development)
4. **Xcode configured** with your Apple ID

## Quick Method: Using Terminal

```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm run ios -- --device
```

This will:
- Build the app
- Install it on your connected iPhone
- Launch it automatically

## Method: Using Xcode (More Control)

### Step 1: Open Xcode Workspace

```bash
cd /Users/tomas/repos/Healthpuck/mobile/ios
open Healthpuck.xcworkspace
```

**Important:** Always open `.xcworkspace`, NOT `.xcodeproj`

### Step 2: Select Your Device

1. In Xcode, look at the top toolbar
2. Click the device dropdown (next to the Play button)
3. Select your iPhone from the list
   - It should show as "Your iPhone Name" or similar
   - If it says "Unavailable", you may need to trust the computer on your iPhone

### Step 3: Configure Signing

1. Select the **Healthpuck** target (left sidebar, blue icon)
2. Go to **"Signing & Capabilities"** tab
3. **Team**: Select your Apple ID team
   - If not listed, click "Add Account..." and sign in
4. **Bundle Identifier**: Should be `com.healthpuck.app`
5. Xcode will automatically create a provisioning profile

### Step 4: Build and Run

1. Click the **Play button (▶)** in Xcode
2. First build may take a few minutes
3. The app will install and launch on your iPhone

## Troubleshooting

### "Device not found" or "Unavailable"

1. **Trust the computer** on your iPhone:
   - Unlock your iPhone
   - When prompted, tap "Trust This Computer"
   - Enter your passcode

2. **Check USB connection**:
   - Try a different USB cable
   - Try a different USB port
   - Make sure it's a data cable (not just charging)

3. **Check in Xcode**:
   - Window → Devices and Simulators
   - Your iPhone should appear in the list
   - If it shows "Unavailable", click it and check the error message

### "No signing certificate found"

1. In Xcode: **Preferences → Accounts**
2. Select your Apple ID
3. Click **"Download Manual Profiles"**
4. Go back to Signing & Capabilities
5. Select your team again

### "Provisioning profile doesn't match"

1. In Xcode: **Product → Clean Build Folder** (Shift+Cmd+K)
2. Delete DerivedData:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```
3. Try building again

### "Untrusted Developer" on iPhone

After installing, if you see "Untrusted Developer":
1. On iPhone: **Settings → General → VPN & Device Management**
2. Tap your developer account
3. Tap **"Trust [Your Name]"**
4. Tap **"Trust"** to confirm

### Build Fails

1. **Clean build**:
   - Product → Clean Build Folder (Shift+Cmd+K)
   - Delete DerivedData (see above)

2. **Check Metro is running**:
   ```bash
   cd /Users/tomas/repos/Healthpuck/mobile
   npm start
   ```

3. **Rebuild pods**:
   ```bash
   cd /Users/tomas/repos/Healthpuck/mobile/ios
   export PATH="$HOME/.gem/ruby/3.2.0/bin:$PATH"
   pod install
   ```

## Quick Commands

```bash
# List connected devices
xcrun xctrace list devices

# Build and run on device (terminal)
cd /Users/tomas/repos/Healthpuck/mobile
npm run ios -- --device

# Open Xcode workspace
cd /Users/tomas/repos/Healthpuck/mobile/ios
open Healthpuck.xcworkspace
```

## Notes

- **First build** takes 5-15 minutes
- **Free Apple Developer Account** works for development (no paid membership needed)
- **App expires** after 7 days (free account) - just rebuild to extend
- **Metro bundler** must be running for the app to work


