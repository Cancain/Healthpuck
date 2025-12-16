# Metro Bundler Troubleshooting

## The Problem

**"No bundle URL present"** error means Metro bundler isn't running or the app can't connect to it.

## Solution 1: Use `npm run ios` (Recommended)

This command handles everything automatically:

```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm run ios
```

This will:
1. ✅ Start Metro bundler automatically
2. ✅ Build the iOS app
3. ✅ Launch the simulator
4. ✅ Connect everything together

**This is the easiest way!**

## Solution 2: Start Metro Manually

If you want to run Metro separately:

### Terminal 1: Start Metro
```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm start
```

Wait until you see:
```
Metro waiting on exp://192.168.x.x:8081
```

### Terminal 2: Build and Run iOS
```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm run ios
```

Or build in Xcode and press Play.

## Solution 3: Fix Connection Issues

If Metro is running but the app still can't connect:

### Check Metro is Running
```bash
curl http://localhost:8081/status
```

Should return: `{"status":"running"}`

### Check Your IP Address
Metro needs to be accessible from the simulator. Check your Mac's IP:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Reset Metro Cache
```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm start -- --reset-cache
```

### Kill All Node Processes
```bash
killall node
```

Then restart Metro.

## Solution 4: Reload in Simulator

Once Metro is running:
- Press **⌘R** in the simulator to reload
- Or shake device: **Device → Shake** → Tap "Reload"

## Quick Fix Checklist

1. ✅ Kill any existing Metro: `killall node`
2. ✅ Start Metro: `cd mobile && npm start`
3. ✅ Wait for "Metro waiting on..." message
4. ✅ In simulator, press **⌘R** to reload
5. ✅ Or run: `npm run ios` (does everything automatically)

## Still Not Working?

Try this complete reset:

```bash
# Kill everything
killall node
killall -9 node

# Clear caches
cd /Users/tomas/repos/Healthpuck/mobile
rm -rf node_modules/.cache
npm start -- --reset-cache
```

Then in another terminal:
```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm run ios
```

