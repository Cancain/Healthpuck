# CORS Troubleshooting Guide

## Current Issue

After updating the `CORS_ORIGIN` GitHub secret, you're still seeing CORS errors and the site keeps loading.

## What Was Fixed

1. **CORS Error Handling**: Changed CORS rejection to return `false` instead of throwing an error, preventing 500 status codes
2. **Debug Endpoint**: Added `/health/cors` endpoint to check current CORS configuration

## Steps to Fix

### 1. Verify GitHub Secret is Correct

1. Go to GitHub → Settings → Secrets and variables → Actions
2. Check that `CORS_ORIGIN` contains exactly:
   ```
   https://app.healthpuck.se
   ```
   (Or comma-separated if you have multiple: `https://cancain.github.io,https://app.healthpuck.se`)

### 2. Commit and Push the CORS Fix

The backend code has been improved. You need to commit and push:

```bash
cd backend
git add src/index.ts
git commit -m "Fix CORS error handling to prevent 500 errors"
git push origin main
```

This will automatically trigger a backend deployment via GitHub Actions.

### 3. Verify Deployment

After the deployment completes (check GitHub Actions):

1. **Check CORS Configuration**:

   ```bash
   curl https://backend-hidden-butterfly-2266.fly.dev/health/cors
   ```

   This should show the currently allowed origins.

2. **Test with Your Domain**:
   ```bash
   curl -v https://backend-hidden-butterfly-2266.fly.dev/health/cors \
     -H "Origin: https://app.healthpuck.se"
   ```

### 4. If Still Not Working

If the debug endpoint shows `app.healthpuck.se` is not in allowed origins:

1. **Double-check the GitHub secret** value matches exactly (case-sensitive, must include `https://`)
2. **Manually trigger deployment**:
   - Go to GitHub Actions
   - Select "Deploy backend to Fly.io"
   - Click "Run workflow"

3. **Alternative: Update via Fly CLI directly**:

   ```bash
   cd backend
   fly secrets set CORS_ORIGIN="https://app.healthpuck.se" --app backend-hidden-butterfly-2266
   ```

   Then restart the app:

   ```bash
   fly apps restart backend-hidden-butterfly-2266
   ```

## Verify Fix

After deployment:

1. Clear browser cache or use incognito mode
2. Visit `https://app.healthpuck.se`
3. Check browser console - CORS errors should be gone
4. Site should load normally

## Debug Endpoint

The new `/health/cors` endpoint shows:

- Currently allowed origins
- The origin of the current request
- Whether the current origin is allowed

Use it to verify your CORS configuration is correct.
