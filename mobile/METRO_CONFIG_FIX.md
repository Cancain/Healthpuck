# Metro Config Fix

## The Error

`defaultConfig.resolver.resolveRequest is not a function`

## What Happened

The default Metro config doesn't expose `resolveRequest` directly. I've fixed it to use the context's default resolution.

## Fixed Metro Config

The config now:
1. ✅ Handles `@babel/runtime` modules with custom resolution
2. ✅ Falls back to Metro's default resolution for everything else
3. ✅ Uses `context.resolveRequest` which is the proper way to delegate

## For Xcode Builds

Since you're using Xcode to build:

1. **Start Metro separately** (in a terminal):
   ```bash
   cd /Users/tomas/repos/Healthpuck/mobile
   npm start
   ```

2. **Or let Xcode start it** - Xcode will automatically start Metro when you build

3. **Build in Xcode** - Click the Play button (▶)

Metro should now work correctly with the fixed config!

