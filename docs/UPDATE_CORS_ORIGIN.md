# Quick Fix: Update CORS_ORIGIN for app.healthpuck.se

## Immediate Action Required

The frontend at `https://app.healthpuck.se` is being blocked by CORS. Update the GitHub secret to fix it.

### Option 1: Update via GitHub UI (Recommended)

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Find `CORS_ORIGIN` and click **Update**
4. Set the value to include your new domain:

   **Single domain:**

   ```
   https://app.healthpuck.se
   ```

   **Multiple domains (comma-separated):**

   ```
   https://cancain.github.io,https://app.healthpuck.se
   ```

5. Click **Update secret**
6. Manually trigger the backend deployment:
   - Go to **Actions** tab
   - Select **Deploy backend to Fly.io**
   - Click **Run workflow** → **Run workflow**

### Option 2: Update via Fly CLI (Direct, bypasses GitHub)

If you want to update directly without going through GitHub:

```bash
cd backend
fly secrets set CORS_ORIGIN="https://app.healthpuck.se" --app backend-hidden-butterfly-2266
```

**Note:** If you use this method, the next GitHub Actions deployment will overwrite it with the GitHub secret value.

## Verify the Fix

After updating and deploying:

1. Wait 2-3 minutes for the backend to redeploy
2. Refresh `https://app.healthpuck.se`
3. The CORS error should be gone

## Troubleshooting

- **Still seeing errors?** Check Fly.io logs:
  ```bash
  fly logs --app backend-hidden-butterfly-2266
  ```
- **500 errors?** The 500 might be from CORS blocking. After fixing CORS, check logs for other errors.
