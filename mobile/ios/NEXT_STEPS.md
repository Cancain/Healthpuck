# Next Steps - Configure Xcode and Build

## Step 1: Configure Signing & Capabilities (In Xcode)

Now that Xcode is open, follow these steps:

### 1.1: Select the Target
- In the **left sidebar**, find the blue **"Healthpuck"** icon at the top
- Click on it once to select the project
- In the **main area**, look for **"TARGETS"** section on the left
- Click on **"Healthpuck"** (not HealthpuckTests)

### 1.2: Set Bundle Identifier
- With **"Healthpuck"** target selected, click the **"General"** tab at the top
- Find **"Identity"** section
- Set **"Bundle Identifier"** to: `com.healthpuck.app`

### 1.3: Set Deployment Target
- Still in the **"General"** tab
- Scroll down to **"Deployment Info"** section
- Set **"iOS"** (Minimum Deployments) to: `13.4` or higher

### 1.4: Configure Signing
- Click the **"Signing & Capabilities"** tab at the top
- Check the box: **"Automatically manage signing"** ✅
- Under **"Team"**, click the dropdown:
  - If you see your name/email: Select it ✅
  - If you see "Add an Account...": Click it and sign in with your Apple ID (free account works!)
  - Xcode will automatically create a provisioning profile

### 1.5: Add Background Modes Capability
- Still in **"Signing & Capabilities"** tab
- Click the **"+ Capability"** button (top of the capabilities list)
- Search for **"Background Modes"** and double-click it
- Under **"Background Modes"**, check: **"Uses Bluetooth LE accessories"** ✅

## Step 2: Select a Simulator or Device

### Option A: iOS Simulator (Easier for Testing)
- Look at the **top toolbar** in Xcode
- Find the device selector (might say "Any iOS Device" or "iPhone 15 Pro")
- Click it to open dropdown
- Under **"iOS Simulators"**, select any iPhone (e.g., "iPhone 15 Pro")

### Option B: Physical iPhone (For Real Bluetooth Testing)
- Connect your iPhone via USB
- Unlock iPhone and trust the computer if prompted
- Select your iPhone from the device dropdown

## Step 3: Build and Run

### Option A: Using Xcode (Recommended for First Time)
- Click the **Play button (▶)** in the top toolbar
- Xcode will build the app (first build takes 5-15 minutes)
- The app will launch on your simulator/device

### Option B: Using Terminal
```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm run ios
```

## What to Expect

1. **First build** takes 5-15 minutes - be patient!
2. **Metro bundler** will start automatically (shows JavaScript bundle progress)
3. **App launches** on simulator/device
4. **Bluetooth permission** will be requested - tap "Allow"
5. **Login screen** should appear

## Troubleshooting

### "No such module 'React'"
- Make sure you opened `.xcworkspace`, not `.xcodeproj`
- Close Xcode and reopen the workspace

### Signing Errors
- Make sure you selected a Team in "Signing & Capabilities"
- Sign in with Apple ID if needed (free account works)

### Build Fails
- Clean build: **Product → Clean Build Folder** (Shift+Cmd+K)
- Delete DerivedData: `rm -rf ~/Library/Developer/Xcode/DerivedData`
- Try building again

### Metro Bundler Issues
- If Metro doesn't start, run manually:
  ```bash
  cd /Users/tomas/repos/Healthpuck/mobile
  npm start
  ```
- Then build in Xcode or run `npm run ios` in another terminal

## Quick Checklist

- [ ] Bundle Identifier set to `com.healthpuck.app`
- [ ] iOS Deployment Target set to `13.4+`
- [ ] Team selected in Signing & Capabilities
- [ ] Background Modes capability added
- [ ] "Uses Bluetooth LE accessories" checked
- [ ] Simulator or device selected
- [ ] Build successful
- [ ] App launches and requests Bluetooth permission

## You're Almost There! 🚀

Once you've configured signing and capabilities in Xcode, you're ready to build and run your iOS app!

