# Fix CORS Error for app.healthpuck.se

## Problem

The frontend at `https://app.healthpuck.se` is being blocked by CORS when making requests to the backend. The error shows:

```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://backend-hidden-butterfly-2266.fly.dev/api/auth/me. (Reason: CORS header 'Access-Control-Allow-Origin' missing).
```

## Solution

Update the `CORS_ORIGIN` GitHub secret to include `https://app.healthpuck.se`. The backend supports multiple origins (comma-separated), so you can include both the old and new domains if needed.

### Steps

1. **Go to GitHub Repository Settings**
   - Navigate to your repository on GitHub
   - Click on **Settings** → **Secrets and variables** → **Actions**

2. **Update CORS_ORIGIN Secret**
   - Find the `CORS_ORIGIN` secret
   - Click **Update**
   - Add `https://app.healthpuck.se` to the value

   **If you have multiple origins**, separate them with commas:

   ```
   https://cancain.github.io,https://app.healthpuck.se
   ```

   **Or if you only want the new domain**:

   ```
   https://app.healthpuck.se
   ```

3. **Trigger a Backend Deployment**
   - The GitHub Actions workflow (`.github/workflows/backend-fly.yml`) will automatically deploy when you push changes to `backend/`
   - OR manually trigger the workflow:
     - Go to **Actions** tab
     - Select **Deploy backend to Fly.io**
     - Click **Run workflow**

4. **Wait for Deployment**
   - The workflow will update the Fly.io secrets and redeploy the backend
   - This usually takes 2-3 minutes

5. **Verify CORS is Fixed**
   - Try accessing `https://app.healthpuck.se` again
   - The CORS error should be resolved

## Backend Code

The backend CORS configuration (in `backend/src/index.ts`) already supports multiple origins:

```typescript
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const allowedOrigins = CORS_ORIGIN.split(",")
  .map((o) => o.trim())
  .filter(Boolean);
```

So you can include multiple comma-separated domains in the secret.

## Alternative: Update via Fly CLI

If you prefer to update directly via Fly CLI (bypassing GitHub secrets):

```bash
cd backend
fly secrets set CORS_ORIGIN="https://app.healthpuck.se" --app backend-hidden-butterfly-2266
```

Note: This will be overwritten by the GitHub Actions workflow if it's configured to sync secrets.

## Troubleshooting

- **Still seeing CORS errors?** Check that the domain in the error matches exactly what you added (including `https://`)
- **500 Error?** The CORS issue might be masking a backend error. Check Fly.io logs: `fly logs --app backend-hidden-butterfly-2266`
- **Multiple domains not working?** Ensure they're comma-separated with no spaces around commas (spaces around origins are fine after the comma)
