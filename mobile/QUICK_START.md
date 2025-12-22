# Quick Start - Running the iOS App

## Important: Use the `mobile` Directory

The React Native mobile app is in the `mobile` directory, not the root.

## Start Metro Bundler

```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm start
```

Or with bun:
```bash
cd /Users/tomas/repos/Healthpuck/mobile
bun start
```

## Run on iOS

**Option 1: From Terminal (Easiest)**
```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm run ios
```

This automatically:
- Starts Metro bundler
- Builds the iOS app
- Launches the simulator

**Option 2: From Xcode**
1. Start Metro first:
   ```bash
   cd /Users/tomas/repos/Healthpuck/mobile
   npm start
   ```
2. Then build in Xcode (click Play ▶)

## Directory Structure

```
Healthpuck/
├── mobile/          ← React Native app (use this!)
│   ├── ios/
│   ├── android/
│   └── src/
├── backend/         ← Backend API
└── src/             ← Web app (different project)
```

## Common Mistake

❌ **Wrong:** Running `npm start` from root (`/Users/tomas/repos/Healthpuck`)
- This tries to start the web app (react-scripts)

✅ **Correct:** Running `npm start` from mobile directory
- This starts React Native Metro bundler

## Quick Reference

```bash
# Always start from mobile directory
cd /Users/tomas/repos/Healthpuck/mobile

# Start Metro
npm start

# Run iOS (in another terminal or after Metro starts)
npm run ios
```

