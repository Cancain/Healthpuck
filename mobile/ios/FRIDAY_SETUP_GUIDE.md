# Friday iOS Setup Guide - Step by Step

**Complete beginner-friendly guide for setting up and compiling the iOS app on macOS.**

## Before You Start - Prerequisites Check

### 1. Check macOS Version

- Click the Apple logo (🍎) in the top-left corner
- Click "About This Mac"
- You need macOS 10.15 (Catalina) or newer
- ✅ **If you see macOS 11, 12, 13, or 14, you're good!**

### 2. Check if Xcode is Installed

- Press `Cmd + Space` to open Spotlight search
- Type "Xcode" and press Enter
- If Xcode opens, you're good! ✅
- If not found, continue to installation steps below

### 3. Check if Node.js is Installed

- Open Terminal (press `Cmd + Space`, type "Terminal", press Enter)
- Type: `node --version` and press Enter
- You should see something like `v18.x.x` or `v20.x.x`
- ✅ **If you see v18 or higher, you're good!**
- ❌ If not, you'll need to install Node.js (see troubleshooting section)

---

## Step 1: Install Xcode (If Not Already Installed)

### Option A: From Mac App Store (Recommended)

1. Open the **App Store** app (click the App Store icon in the dock)
2. In the search bar at the top, type: **Xcode**
3. Click the **Get** or **Install** button (it's free, but large - ~15GB)
4. Wait for download to complete (this can take 30-60 minutes depending on internet speed)
5. Once installed, open Xcode from Applications
6. Xcode will ask to install additional components - click **Install** and wait

### Option B: From Apple Developer Website

1. Go to: https://developer.apple.com/xcode/
2. Click "Download" button
3. Sign in with Apple ID (you can use a free Apple ID)
4. Download and install

**⚠️ Important:** After installing Xcode, you MUST open it once and accept the license agreement before continuing.

---

## Step 2: Install Command Line Tools

1. Open **Terminal** (press `Cmd + Space`, type "Terminal", press Enter)
2. Type this command and press Enter:
   ```bash
   xcode-select --install
   ```
3. A popup window will appear asking to install command line tools
4. Click **Install**
5. Wait for installation to complete (5-10 minutes)
6. When done, you'll see "The software was installed" message

---

## Step 3: Install CocoaPods

1. In Terminal, type this command and press Enter:
   ```bash
   sudo gem install cocoapods
   ```
2. You'll be asked for your Mac password (the one you use to log in)
   - Type your password (you won't see it as you type - this is normal)
   - Press Enter
3. Wait for installation (2-5 minutes)
4. When done, verify it worked by typing:
   ```bash
   pod --version
   ```
5. You should see a version number like `1.12.0` or similar ✅

---

## Step 4: Navigate to the Project

1. Open **Terminal**
2. Navigate to the project folder. Type these commands one by one:
   ```bash
   cd ~/repos/healthpack/mobile
   ```
   (If your project is in a different location, adjust the path)
3. Verify you're in the right place by typing:
   ```bash
   pwd
   ```
   You should see a path ending in `/healthpack/mobile`

---

## Step 5: Install Node Dependencies (If Not Done)

1. In Terminal (still in the `mobile` folder), type:
   ```bash
   npm install
   ```
2. Wait for installation to complete (2-5 minutes)
3. You should see a success message ✅

---

## Step 6: Generate Xcode Project

1. In Terminal (still in the `mobile` folder), run the setup script:

   ```bash
   cd ios
   ./setup-ios.sh
   ```

   **OR** if the script doesn't work, do it manually:

   ```bash
   cd mobile
   npx react-native init Healthpuck --skip-install --directory temp_ios
   cp -r temp_ios/ios/* ios/
   rm -rf temp_ios
   ```

2. Wait for it to complete (this may take 5-10 minutes)
3. You should see "✅ iOS setup complete!" message

---

## Step 7: Install CocoaPods Dependencies

1. In Terminal, make sure you're in the `ios` folder:
   ```bash
   cd ios
   ```
2. Type:
   ```bash
   pod install
   ```
3. Wait for installation (this can take 5-15 minutes the first time)
4. You should see "Pod installation complete!" at the end ✅
5. **Important:** You should now see a file called `Healthpuck.xcworkspace` in the `ios` folder

---

## Step 8: Open Project in Xcode

### Method 1: From Terminal (Easiest)

1. In Terminal (still in the `ios` folder), type:
   ```bash
   open Healthpuck.xcworkspace
   ```
2. Xcode should open automatically

### Method 2: From Finder

1. Open **Finder**
2. Navigate to: `healthpack/mobile/ios/`
3. **Double-click** the file called `Healthpuck.xcworkspace`
   - ⚠️ **Important:** Make sure you click `.xcworkspace`, NOT `.xcodeproj`
   - The workspace file has a blue icon with a white "W"

---

## Step 9: Understanding Xcode Interface

When Xcode opens, you'll see:

```
┌─────────────────────────────────────────────────────────┐
│ File Edit View Navigate Editor Product Debug Window Help │ ← Menu Bar
├─────────────────────────────────────────────────────────┤
│ [▶] [⏸] [◼]  Healthpuck > iPhone 15 Pro  [Device]      │ ← Toolbar
├──────┬──────────────────────────────────────────────────┤
│      │                                                  │
│ Left │              Main Editor Area                    │
│ Panel│              (Code/Interface)                    │
│      │                                                  │
│      │                                                  │
├──────┴──────────────────────────────────────────────────┤
│ [No Issues] [Warnings: 0] [Errors: 0]                   │ ← Status Bar
└─────────────────────────────────────────────────────────┘
```

**Key Areas:**

- **Left Panel (Navigator):** Shows your project files
- **Top Toolbar:** Has the Play button (▶) to run the app
- **Device Selector:** Shows which device/simulator to run on
- **Right Panel (Inspector):** Shows file/project settings (may be hidden)

---

## Step 10: Configure Project Settings

### 10.1: Select the Project

1. In the **left panel**, look for a blue icon at the very top called **"Healthpuck"**
2. Click on it once (it should turn blue/highlighted)

### 10.2: Select the Target

1. In the **main area** (center), you'll see tabs at the top: "General", "Signing & Capabilities", "Info", etc.
2. Look for a section on the left side that says **"TARGETS"**
3. Under TARGETS, click on **"Healthpuck"** (there might be a "HealthpuckTests" too - ignore that one)

### 10.3: Set Bundle Identifier

1. With "Healthpuck" target selected, click the **"General"** tab at the top
2. Look for **"Identity"** section
3. Find **"Bundle Identifier"** field
4. Change it to: `com.healthpuck.app`
5. Press Enter or click elsewhere to save

### 10.4: Set Deployment Target

1. Still in the **"General"** tab
2. Scroll down to **"Deployment Info"** section
3. Find **"iOS"** dropdown (next to "Minimum Deployments")
4. Click the dropdown and select **"13.4"** or higher
5. If you don't see 13.4, type it in manually

### 10.5: Configure Signing

1. Click the **"Signing & Capabilities"** tab at the top
2. Find the **"Signing"** section
3. Check the box that says **"Automatically manage signing"** ✅
4. Under **"Team"**, click the dropdown
5. You'll see options:
   - If you see your name/email: Select it ✅
   - If you see "Add an Account...": Click it, sign in with Apple ID
   - If you see "None": You need to add your Apple ID (see troubleshooting)

**What to expect:**

- Xcode will automatically create a provisioning profile
- You might see a yellow warning - that's usually okay for development
- If you see a red error, see troubleshooting section

### 10.6: Add Background Modes Capability

1. Still in **"Signing & Capabilities"** tab
2. Look at the top of the capabilities list
3. Click the **"+ Capability"** button (usually in the top-right of the capabilities area)
4. A search window will appear
5. Type: **"Background Modes"**
6. Double-click **"Background Modes"** to add it
7. You should now see "Background Modes" in your capabilities list
8. Under "Background Modes", check the box: **"Uses Bluetooth LE accessories"** ✅

---

## Step 11: Verify Info.plist Settings

1. In the **left panel**, expand the **"Healthpuck"** folder (click the triangle next to it)
2. Find and click on **"Info.plist"**
3. The file will open in the main editor
4. Look for these entries (they should already be there):
   - **"Privacy - Bluetooth Always Usage Description"** - Should say something about Bluetooth
   - **"Privacy - Bluetooth Peripheral Usage Description"** - Should say something about Bluetooth
   - **"Required background modes"** - Should include "bluetooth-central"
5. If any are missing, you can add them, but they should already be configured ✅

---

## Step 12: Select a Simulator or Device

### Option A: Use iOS Simulator (Easier for Testing)

1. Look at the **top toolbar** in Xcode
2. Find the device selector (it might say "iPhone 15 Pro" or "Any iOS Device")
3. Click on it to open the dropdown
4. Under **"iOS Simulators"**, select any iPhone (e.g., "iPhone 15 Pro")
5. If you don't see simulators, Xcode will download them automatically (this takes time)

### Option B: Use Physical iPhone (For Real Bluetooth Testing)

1. Connect your iPhone to the Mac with a USB cable
2. Unlock your iPhone
3. If iPhone asks "Trust This Computer?", tap **"Trust"**
4. Enter your iPhone passcode
5. In Xcode's device selector, your iPhone should appear
6. Select your iPhone from the list

---

## Step 13: Build and Run the App

### Method 1: Using Xcode (Recommended for First Time)

1. In Xcode, look at the **top toolbar**
2. Find the **Play button** (▶) - it's a triangle pointing right
3. Click the Play button
4. Xcode will start building (you'll see progress in the top status bar)
5. **First build takes 5-15 minutes** - be patient!
6. You'll see messages like:
   - "Building..."
   - "Running Healthpuck..."
   - "Installing..."
7. The app should launch on your simulator/device

**What to expect:**

- If successful: App opens on simulator/device ✅
- If errors appear: See troubleshooting section below

### Method 2: Using Terminal (Alternative)

1. Open Terminal
2. Navigate to mobile folder:
   ```bash
   cd ~/repos/healthpack/mobile
   ```
3. Start Metro bundler (in one terminal):
   ```bash
   npm start
   ```
4. In another Terminal window, run:
   ```bash
   cd ~/repos/healthpack/mobile
   npm run ios
   ```

---

## Step 14: Test the App

Once the app is running:

1. **Login Screen:** You should see a login interface
2. **Bluetooth:** The app will ask for Bluetooth permission - tap **"Allow"**
3. **Location:** iOS may also ask for location permission (required for BLE) - tap **"Allow"**
4. **Test Features:**
   - Try logging in
   - Try scanning for Bluetooth devices
   - Try connecting to a heart rate monitor

---

## Troubleshooting Common Issues

### Issue: "No such module 'React'"

**Solution:**

- Make sure you opened `Healthpuck.xcworkspace`, NOT `Healthpuck.xcodeproj`
- Close Xcode
- Delete the `ios/Pods` folder and `ios/Podfile.lock`
- Run `pod install` again in Terminal
- Reopen the `.xcworkspace` file

### Issue: Signing Errors (Red Errors in Xcode)

**Solution:**

1. Go to **"Signing & Capabilities"** tab
2. Click **"+ Capability"** → **"Add an Account..."**
3. Sign in with your Apple ID (free account works)
4. Select your account from the Team dropdown
5. Xcode will create a provisioning profile automatically

### Issue: "Command PhaseScriptExecution failed"

**Solution:**

1. In Xcode menu: **Product** → **Clean Build Folder** (or press `Shift + Cmd + K`)
2. Close Xcode
3. In Terminal:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```
4. Reopen Xcode and try building again

### Issue: CocoaPods Installation Fails

**Solution:**

1. Update CocoaPods:
   ```bash
   sudo gem install cocoapods --user-install
   ```
2. Update pod repo:
   ```bash
   pod repo update
   ```
3. Try `pod install` again

### Issue: Simulator Won't Start

**Solution:**

1. In Xcode menu: **Xcode** → **Settings** (or **Preferences**)
2. Go to **"Platforms"** or **"Components"** tab
3. Download iOS Simulator if missing
4. Or use a physical device instead

### Issue: Build Takes Forever

**Solution:**

- First build always takes 10-15 minutes - this is normal!
- Make sure you have good internet connection
- Close other heavy applications
- Be patient - subsequent builds are much faster

### Issue: "Cannot find module" Errors

**Solution:**

1. Close Xcode
2. In Terminal:
   ```bash
   cd ~/repos/healthpack/mobile/ios
   pod deintegrate
   pod install
   ```
3. Reopen `.xcworkspace` file

### Issue: Bluetooth Permission Not Requested

**Solution:**

1. Check `Info.plist` has `NSBluetoothAlwaysUsageDescription`
2. Delete the app from simulator/device
3. Rebuild and reinstall
4. iOS will ask for permission on first launch

---

## Quick Reference Checklist

Use this checklist on Friday:

- [ ] Xcode installed and opened at least once
- [ ] Command line tools installed (`xcode-select --install`)
- [ ] CocoaPods installed (`pod --version` works)
- [ ] Node.js installed (`node --version` shows v18+)
- [ ] Navigated to project folder (`cd ~/repos/healthpack/mobile`)
- [ ] Ran `npm install` (if not done before)
- [ ] Generated Xcode project (setup script or manual)
- [ ] Ran `pod install` successfully
- [ ] Opened `Healthpuck.xcworkspace` in Xcode
- [ ] Set Bundle Identifier to `com.healthpuck.app`
- [ ] Set iOS Deployment Target to 13.4+
- [ ] Configured signing with Apple ID/Team
- [ ] Added Background Modes capability
- [ ] Checked "Uses Bluetooth LE accessories"
- [ ] Selected simulator or device
- [ ] Built and ran the app successfully
- [ ] App launches and requests Bluetooth permission

---

## Getting Help

If you get stuck:

1. **Check the error message** - Xcode shows errors in red at the bottom
2. **Read the error details** - Click on red errors to see more info
3. **Check Terminal output** - Sometimes errors appear in Terminal, not Xcode
4. **Try the troubleshooting steps** above
5. **Check documentation:**
   - `ios/README.md` - Detailed iOS guide
   - `ios/QUICK_START.md` - Quick reference

---

## What Success Looks Like

✅ **You're done when:**

- App builds without errors
- App launches on simulator/device
- App shows login screen
- App requests Bluetooth permission (and you allow it)
- You can scan for Bluetooth devices
- You can connect to a heart rate monitor

**Good luck on Friday! 🚀**
