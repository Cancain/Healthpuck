# Network Request Failed - Fixed

## Issues Found

1. **Wrong Backend URL**: Was using `https://healthpuck.fly.dev` (doesn't exist)
   - **Fixed**: Changed to `https://backend-hidden-butterfly-2266.fly.dev`

2. **CORS Rejecting Mobile Apps**: Backend was rejecting requests without `Origin` header
   - **Fixed**: Updated backend CORS to allow requests without origin (mobile apps don't send Origin)

## Changes Made

### Mobile Config (`mobile/src/config.ts`)
```typescript
export const API_BASE_URL = 'https://backend-hidden-butterfly-2266.fly.dev';
```

### Backend CORS (`backend/src/index.ts`)
Changed from:
```typescript
if (!origin) {
  return callback(null, false);  // ❌ Rejected mobile apps
}
```

To:
```typescript
if (!origin) {
  return callback(null, true);  // ✅ Allow mobile apps
}
```

## Next Steps

1. **Deploy the backend fix** (if you have access):
   ```bash
   cd backend
   fly deploy
   ```

2. **Reload the mobile app**:
   - Press `⌘R` in simulator, or
   - Shake device → "Reload"

3. **Test the connection**:
   - Try logging in
   - Should now connect to production backend

## If Still Failing

Check:
- Backend is deployed and running
- Backend URL is correct: `https://backend-hidden-butterfly-2266.fly.dev`
- Mobile app has internet connection
- Backend CORS fix is deployed

