# iOS Compilation Guide - Current Status

## Prerequisites Status

Based on the current system check:

- ❌ **Node.js**: Not found in PATH
- ❌ **CocoaPods**: Not installed
- ⚠️ **Xcode**: Command line tools detected, but full Xcode may be needed

## Step-by-Step Setup

### 1. Install Node.js

You need Node.js 18+ for React Native. Choose one method:

**Option A: Using Homebrew (Recommended)**
```bash
brew install node@18
# Or for latest LTS:
brew install node
```

**Option B: Using nvm (Node Version Manager)**
```bash
# Install nvm first
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.zshrc

# Install Node.js
nvm install 18
nvm use 18
```

**Option C: Download from nodejs.org**
- Visit: https://nodejs.org/
- Download the LTS version
- Install the .pkg file

**Verify installation:**
```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show version number
```

### 2. Install Xcode (If Not Already Installed)

**Check if Xcode is installed:**
```bash
xcode-select -p
# If it shows /Applications/Xcode.app, you're good!
```

**If Xcode is not installed:**
1. Open Mac App Store
2. Search for "Xcode"
3. Click "Get" or "Install" (it's free but large ~15GB)
4. After installation, open Xcode once to accept license
5. Install additional components when prompted

**Verify Xcode:**
```bash
xcodebuild -version  # Should show version number
```

### 3. Install CocoaPods

After Node.js is installed, run:
```bash
sudo gem install cocoapods
```

You'll be asked for your Mac password. This is normal.

**Verify installation:**
```bash
pod --version  # Should show version like 1.12.0
```

### 4. Install Project Dependencies

Once Node.js is installed, run:
```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm install
```

This will install all React Native dependencies.

### 5. Set Up iOS Project

Run the setup script:
```bash
cd /Users/tomas/repos/Healthpuck/mobile/ios
chmod +x setup-ios.sh
./setup-ios.sh
```

This will:
- Generate the Xcode project
- Install CocoaPods dependencies

### 6. Open in Xcode

```bash
cd /Users/tomas/repos/Healthpuck/mobile/ios
open Healthpuck.xcworkspace
```

**⚠️ Important:** Always open `.xcworkspace`, NOT `.xcodeproj`

### 7. Configure Xcode Settings

In Xcode:
1. Select the **Healthpuck** target (left sidebar, blue icon)
2. Go to **"Signing & Capabilities"** tab
3. Set **Bundle Identifier**: `com.healthpuck.app`
4. Select your **Team** (sign in with Apple ID if needed)
5. Set **iOS Deployment Target**: `13.4` or higher
6. Click **"+ Capability"** → Add **"Background Modes"**
7. Check **"Uses Bluetooth LE accessories"** under Background Modes

### 8. Build and Run

**Option A: Using Xcode**
- Select a simulator or device from the device dropdown (top toolbar)
- Click the Play button (▶) to build and run

**Option B: Using Terminal**
```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm run ios
```

## Quick Commands Reference

```bash
# Install dependencies
cd /Users/tomas/repos/Healthpuck/mobile
npm install

# Set up iOS project
cd ios
./setup-ios.sh

# Install/update pods
cd ios
pod install

# Run on simulator
cd /Users/tomas/repos/Healthpuck/mobile
npm run ios

# Run on specific device
npm run ios -- --device "Your iPhone Name"

# Clean build (if having issues)
cd ios
rm -rf Pods Podfile.lock
pod install
```

## Troubleshooting

### "Command not found: node"
- Node.js is not installed or not in PATH
- Install Node.js using one of the methods above
- Restart your terminal after installation

### "pod: command not found"
- CocoaPods is not installed
- Run: `sudo gem install cocoapods`

### "xcodebuild: error: tool 'xcodebuild' requires Xcode"
- Full Xcode is not installed
- Install Xcode from Mac App Store
- Open Xcode once to accept license

### "No such module 'React'"
- Make sure you opened `.xcworkspace`, not `.xcodeproj`
- Run `pod install` in the ios directory
- Clean build folder in Xcode (Product → Clean Build Folder)

### Build errors
- Clean build: In Xcode, Product → Clean Build Folder (Shift+Cmd+K)
- Delete DerivedData: `rm -rf ~/Library/Developer/Xcode/DerivedData`
- Reinstall pods: `cd ios && pod deintegrate && pod install`

## Need More Help?

See the detailed guides:
- `FRIDAY_SETUP_GUIDE.md` - Complete beginner guide
- `QUICK_START.md` - Quick reference
- `README.md` - Technical details

