# Fix: "RNSScreenStackHeaderConfig was not found" Error

## The Problem

The `react-native-screens` native module isn't properly linked. This happens when:
- Pods were installed but the app wasn't rebuilt
- Native modules need to be recompiled after pod install

## Quick Fix

### Option 1: Clean and Rebuild (Recommended)

In Xcode:
1. **Product → Clean Build Folder** (Shift+Cmd+K)
2. Close Xcode
3. Delete DerivedData:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```
4. Reopen Xcode workspace
5. Build again (Play ▶)

### Option 2: Rebuild from Terminal

```bash
cd /Users/tomas/repos/Healthpuck/mobile

# Kill Metro if running
killall node

# Clean build
cd ios
rm -rf ~/Library/Developer/Xcode/DerivedData/Healthpuck-*

# Rebuild
cd ..
npm run ios
```

### Option 3: Reinstall Pods

If the above doesn't work:

```bash
cd /Users/tomas/repos/Healthpuck/mobile/ios
export PATH="$HOME/.gem/ruby/3.2.0/bin:$PATH"
rm -rf Pods Podfile.lock
pod install
```

Then rebuild in Xcode.

## Why This Happens

After installing `react-native-screens`, the native iOS code needs to be compiled. If you installed it after the initial build, Xcode needs to rebuild to include the new native module.

## Current Status

✅ `react-native-screens` is installed (v3.27.0)
✅ Pods should include RNScreens
⚠️ App needs to be rebuilt to link the native module

## Quick Solution

**Just rebuild the app in Xcode:**
1. Clean Build Folder (Shift+Cmd+K)
2. Click Play (▶) to rebuild

The native module should link properly after a clean rebuild!

