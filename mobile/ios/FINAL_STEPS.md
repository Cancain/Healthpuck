# Final Steps to Complete iOS Setup

## ✅ What's Been Done Automatically

1. ✅ **Node.js installed** - v25.2.1
2. ✅ **npm dependencies installed** - All React Native packages
3. ✅ **Xcode project generated** - Healthpuck.xcodeproj created
4. ✅ **Info.plist configured** - Bluetooth permissions added
5. ✅ **CocoaPods installed** - v1.16.2 (user install, no sudo needed!)

## ⚠️ One Command You Need to Run

The Xcode developer path needs to be configured. Run this **one command** (it will ask for your password):

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

**Why?** This tells the system to use the full Xcode installation instead of just command line tools, which is required for building iOS apps.

## After Running the Sudo Command

Once you've run the command above, run:

```bash
cd /Users/tomas/repos/Healthpuck/mobile/ios
export PATH="$HOME/.gem/ruby/3.2.0/bin:$PATH"
pod install
```

This will install all CocoaPods dependencies and create the `Healthpuck.xcworkspace` file.

## Then Open in Xcode

```bash
cd /Users/tomas/repos/Healthpuck/mobile/ios
open Healthpuck.xcworkspace
```

**⚠️ Important:** Always open `.xcworkspace`, NOT `.xcodeproj`

## Configure in Xcode

1. Select the **Healthpuck** target (left sidebar, blue icon)
2. Go to **"Signing & Capabilities"** tab:
   - Set **Bundle Identifier**: `com.healthpuck.app`
   - Select your **Team** (sign in with Apple ID if needed)
   - Set **iOS Deployment Target**: `13.4` or higher
   - Click **"+ Capability"** → Add **"Background Modes"**
   - Check **"Uses Bluetooth LE accessories"**

## Build and Run

```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm run ios
```

Or click the Play button (▶) in Xcode!

## Quick Copy-Paste Commands

```bash
# 1. Configure Xcode (requires password)
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# 2. Install CocoaPods dependencies
cd /Users/tomas/repos/Healthpuck/mobile/ios
export PATH="$HOME/.gem/ruby/3.2.0/bin:$PATH"
pod install

# 3. Open in Xcode
open Healthpuck.xcworkspace

# 4. Configure signing in Xcode (see above)

# 5. Run the app
cd /Users/tomas/repos/Healthpuck/mobile
npm run ios
```

## Troubleshooting

### "xcodebuild requires Xcode"
- Make sure you ran: `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`
- Verify Xcode is installed: `ls /Applications/Xcode.app`

### "pod: command not found"
- Add CocoaPods to PATH: `export PATH="$HOME/.gem/ruby/3.2.0/bin:$PATH"`
- Or add to your `~/.zshrc`: `echo 'export PATH="$HOME/.gem/ruby/3.2.0/bin:$PATH"' >> ~/.zshrc`

### Pod install fails
- Make sure Xcode is configured (step 1 above)
- Try: `pod install --repo-update`

