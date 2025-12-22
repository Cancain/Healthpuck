# Production Backend Configuration

## What Changed

I've updated `src/config.ts` to always use the production backend:
- **Production URL**: `https://healthpuck.fly.dev`

## Current Configuration

The app is now configured to use the production backend regardless of dev/prod mode.

## To Switch Back to Development

Edit `src/config.ts` and uncomment the original code:

```typescript
export const API_BASE_URL = __DEV__
  ? 'http://192.168.83.164:3001'  // Your local dev backend
  : 'https://healthpuck.fly.dev';  // Production
```

## Testing

After this change:
1. **Reload the app** in the simulator (⌘R)
2. The app will now connect to `https://healthpuck.fly.dev`
3. Make sure you have valid credentials for the production backend

## Important Notes

- ⚠️ **This uses production database** - be careful with test data
- ⚠️ **Make sure production backend is accessible** from your device/simulator
- ⚠️ **CORS must allow** requests from your device

## Revert to Development

When you want to switch back to local development:

1. Edit `src/config.ts`
2. Restore the original `__DEV__` conditional
3. Reload the app

