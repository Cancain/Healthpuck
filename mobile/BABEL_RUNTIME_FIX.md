# Fix: @babel/runtime Error

## The Problem

Metro bundler can't find `@babel/runtime/helpers/interopRequireDefault` even though it's installed.

## Solution Steps

### 1. Restart Metro with Clean Cache

Stop Metro (if running) and restart with cache cleared:

```bash
cd /Users/tomas/repos/Healthpuck/mobile
killall node
npm start -- --reset-cache
```

### 2. Reload App in Simulator

Once Metro is running, in the simulator:
- Press **⌘R** (Command + R) to reload

### 3. If Still Not Working - Full Reset

```bash
cd /Users/tomas/repos/Healthpuck/mobile

# Kill Metro
killall node

# Clear all caches
rm -rf node_modules/.cache
rm -rf .metro-cache
watchman watch-del-all

# Restart Metro
npm start -- --reset-cache
```

Then reload in simulator (⌘R).

### 4. Alternative: Rebuild the App

If Metro cache clearing doesn't work, rebuild:

```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm run ios
```

This will rebuild everything from scratch.

## What Was Fixed

✅ `@babel/runtime` moved to dependencies (was in devDependencies)
✅ File exists: `node_modules/@babel/runtime/helpers/interopRequireDefault.js`
✅ Cleared Metro caches
✅ Cleared watchman watches

## Next Step

**Restart Metro with `--reset-cache` flag**, then reload the app in simulator!

