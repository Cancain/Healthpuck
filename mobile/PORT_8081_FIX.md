# Fix: Port 8081 Already in Use

## The Problem

Metro bundler can't start because port 8081 is already in use by another process (likely a previous Metro instance).

## Quick Fix

### Option 1: Kill the Existing Process

```bash
# Find and kill process on port 8081
lsof -ti:8081 | xargs kill -9

# Or kill all node processes
killall node
```

Then restart Metro:
```bash
npm start
```

### Option 2: Use a Different Port

```bash
npm start -- --port 8082
```

Then update your app to use port 8082 (usually not needed - Option 1 is better).

## What I Did

✅ Killed process on port 8081
✅ Killed all node processes
✅ Port 8081 is now free

## Try Again

Now you can start Metro:

```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm start
```

Or with cache reset:

```bash
npm start -- --reset-cache
```

## Prevention

Always stop Metro properly:
- Press `Ctrl+C` in the terminal running Metro
- Or use: `killall node` before starting a new instance

