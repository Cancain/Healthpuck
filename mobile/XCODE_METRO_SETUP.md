# Running from Xcode - Metro Setup

## The Issue

When building from Xcode, Metro bundler needs to be running separately. Xcode doesn't automatically start Metro - you need to start it manually.

## Solution: Start Metro Before Building

### Option 1: Start Metro in Terminal (Recommended)

Before building in Xcode, start Metro in a terminal:

```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm start
```

Wait until you see:
```
Metro waiting on exp://192.168.x.x:8081
```

Then build in Xcode (click Play ▶).

### Option 2: Use npm run ios (Easier)

Instead of building in Xcode, use:

```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm run ios
```

This automatically:
- Starts Metro bundler
- Builds the iOS app
- Launches the simulator
- Connects everything together

## Quick Workflow

**For Xcode builds:**
1. Terminal 1: `cd mobile && npm start` (keep running)
2. Xcode: Click Play ▶ to build

**For terminal builds:**
1. Terminal: `cd mobile && npm run ios` (does everything)

## Troubleshooting

### "Connection refused" Error
- Metro isn't running
- Start Metro: `npm start`
- Wait for "Metro waiting on..." message
- Then build in Xcode

### Metro Won't Start
```bash
# Kill any existing Metro
killall node

# Clear caches
rm -rf .metro-cache node_modules/.cache

# Start fresh
npm start -- --reset-cache
```

### Port 8081 Already in Use
```bash
# Find and kill process on port 8081
lsof -ti:8081 | xargs kill -9

# Or kill all node processes
killall node
```

## Current Status

I've started Metro for you. Check the terminal - you should see Metro running.

Then build in Xcode (click Play ▶) and it should connect!

