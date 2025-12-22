# Fix: "Command PhaseScriptExecution failed" Error

## Common Causes

This error usually happens when Xcode build scripts fail. Common causes:

1. **Node.js path issues** - Scripts can't find Node.js
2. **Metro bundler not running** - React Native script needs Metro
3. **Script permissions** - Scripts aren't executable
4. **Missing dependencies** - node_modules incomplete

## Quick Fixes

### 1. Clean Build in Xcode

In Xcode:
- **Product → Clean Build Folder** (or press `Shift+Cmd+K`)
- Delete DerivedData:
  ```bash
  rm -rf ~/Library/Developer/Xcode/DerivedData
  ```
- Try building again

### 2. Verify Node.js Configuration

Check `.xcode.env.local`:
```bash
cat ios/.xcode.env.local
```

Should show:
```
export NODE_BINARY=/opt/homebrew/bin/node
```

If wrong, update it:
```bash
echo 'export NODE_BINARY=/opt/homebrew/bin/node' > ios/.xcode.env.local
```

### 3. Start Metro Before Building

**Important:** Metro bundler must be running before building in Xcode!

```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm start
```

Wait for "Metro waiting on..." then build in Xcode.

### 4. Check Build Script Output

In Xcode:
1. Go to **View → Navigators → Show Report Navigator** (or press `Cmd+9`)
2. Click on the failed build
3. Expand the error to see which script failed
4. Check the error message

### 5. Reinstall Pods

```bash
cd /Users/tomas/repos/Healthpuck/mobile/ios
export PATH="$HOME/.gem/ruby/3.2.0/bin:$PATH"
rm -rf Pods Podfile.lock
pod install
```

### 6. Verify Scripts Are Executable

```bash
cd /Users/tomas/repos/Healthpuck/mobile
chmod +x node_modules/react-native/scripts/*.sh
chmod +x node_modules/react-native/scripts/xcode/*.sh
```

## Most Common Solution

**Start Metro bundler first, then build in Xcode:**

```bash
# Terminal 1: Start Metro
cd /Users/tomas/repos/Healthpuck/mobile
npm start

# Terminal 2 or Xcode: Build
# Click Play (▶) in Xcode
```

## Check Which Script Failed

Look at the Xcode build log to see which specific script phase failed:
- "Bundle React Native code and images" - Usually Metro/Node.js issue
- "[CP] Embed Pods Frameworks" - CocoaPods issue
- "[CP] Copy Pods Resources" - CocoaPods issue

## Current Status

✅ Node.js configured: `/opt/homebrew/bin/node`
✅ Scripts exist and are executable
✅ .xcode.env.local is set correctly

**Next step:** Start Metro bundler, then build in Xcode!

