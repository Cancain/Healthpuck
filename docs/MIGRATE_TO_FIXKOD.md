# Migration Guide: Moving Frontend to app.fixkod.se

This guide will help you move your frontend from `https://cancain.github.io/Healthpuck/` to `app.fixkod.se`.

---

## Overview

- **Current URL**: `https://cancain.github.io/Healthpuck/`
- **New URL**: `https://app.fixkod.se`
- **Hosting**: GitHub Pages (continuing to use, just with custom domain)

---

## Step 1: Update Code Configuration ✅

The `package.json` homepage field has been updated to `https://app.fixkod.se`. This tells React to use absolute URLs from the root.

---

## Step 2: Configure DNS Records

You need to configure DNS for `fixkod.se` domain to point to GitHub Pages.

### 2.1 Get GitHub Pages IP Addresses

GitHub Pages uses the following IP addresses for custom domains:

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

### 2.2 Add DNS Records

In your DNS provider for `fixkod.se`, add **4 A records**:

```
Type: A
Name: app
Value: 185.199.108.153
TTL: 3600

Type: A
Name: app
Value: 185.199.109.153
TTL: 3600

Type: A
Name: app
Value: 185.199.110.153
TTL: 3600

Type: A
Name: app
Value: 185.199.111.153
TTL: 3600
```

**Note**: Some DNS providers require you to add multiple IP addresses to a single A record, while others require separate A records. Check your DNS provider's documentation.

**Alternative**: If your DNS provider supports it, you can also use a CNAME record:

```
Type: CNAME
Name: app
Value: cancain.github.io
TTL: 3600
```

However, GitHub Pages prefers A records for custom domains.

---

## Step 3: Configure GitHub Pages Custom Domain

1. Go to your GitHub repository: `https://github.com/cancain/Healthpuck` (or your actual repo URL)
2. Navigate to **Settings** → **Pages**
3. Under **Custom domain**, enter: `app.fixkod.se`
4. Click **Save**
5. GitHub will automatically:
   - Create a CNAME file (or update it) in your repository
   - Enable SSL certificate provisioning
   - Set up redirects from the old GitHub Pages URL

### 3.1 Verify CNAME File

After setting the custom domain, GitHub will create/update a file at:

- `docs/CNAME` (if you're serving from `/docs` folder)

This file should contain:

```
app.fixkod.se
```

If GitHub doesn't create it automatically, you can create it manually in the `docs` folder.

---

## Step 4: Update Backend Configuration (if needed)

If your backend needs to allow requests from the new domain:

### 4.1 Update CORS Origin in Fly.io

If your backend is on Fly.io, update the CORS_ORIGIN:

```bash
cd backend
fly secrets set CORS_ORIGIN=https://app.fixkod.se
```

Or if you need to allow both old and new domains temporarily:

```bash
fly secrets set CORS_ORIGIN=https://cancain.github.io/Healthpuck,https://app.fixkod.se
```

### 4.2 Update Whoop OAuth Redirect URI (if applicable)

If you're using Whoop OAuth integration:

1. Update Fly.io secrets:

```bash
cd backend
fly secrets set WHOOP_REDIRECT_URI=https://app.fixkod.se/api/integrations/whoop/callback
```

2. Update in Whoop Developer Portal:
   - Go to [Whoop Developer Portal](https://developer.whoop.com)
   - Find your OAuth application
   - Update redirect URI to: `https://app.fixkod.se/api/integrations/whoop/callback`
   - **Note**: If your API is on a different domain (like `api.fixkod.se`), use that domain instead

---

## Step 5: Update Frontend API Configuration

Your frontend uses the `REACT_APP_API_URL` environment variable. Make sure it's configured correctly:

### 5.1 Update GitHub Actions Secret

1. Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Update or add secret: `REACT_APP_API_URL`
   - Value should be your backend API URL (e.g., `https://api.fixkod.se` or `https://your-backend.fly.dev`)

### 5.2 Trigger a New Deployment

After updating the secret, trigger a new deployment:

```bash
git push origin main
```

Or manually trigger the workflow in GitHub Actions.

---

## Step 6: Wait for DNS Propagation

DNS changes can take time to propagate:

- **Usually**: 1-4 hours
- **Maximum**: 24-48 hours

### 6.1 Check DNS Propagation

Use these tools to check if DNS has propagated globally:

- https://www.whatsmydns.net/#A/app.fixkod.se
- https://dnschecker.org/#A/app.fixkod.se
- Command line: `dig app.fixkod.se` or `nslookup app.fixkod.se`

### 6.2 Wait for SSL Certificate

GitHub Pages will automatically provision an SSL certificate for your custom domain. This usually happens within a few minutes to a few hours after DNS propagates.

You can check SSL status in GitHub repo → **Settings** → **Pages**. It should show "Enforce HTTPS" option once SSL is ready.

---

## Step 7: Enable HTTPS Enforcement

Once SSL certificate is provisioned:

1. Go to GitHub repo → **Settings** → **Pages**
2. Check **Enforce HTTPS**
3. This will redirect all HTTP traffic to HTTPS

---

## Step 8: Test Your Migration

After DNS and SSL are ready:

1. **Test the domain**:
   - Visit `https://app.fixkod.se` in your browser
   - Should show your React app

2. **Test API connectivity**:
   - Open browser console
   - Check for any CORS errors
   - Test login functionality

3. **Test OAuth** (if applicable):
   - Test Whoop OAuth connection flow
   - Verify redirects work correctly

4. **Test routing**:
   - Navigate between pages
   - Check that client-side routing works (no 404s)

---

## Step 9: Update Any External References

Update any external services or documentation that reference the old URL:

- Bookmarks
- Documentation
- README files
- External integrations
- OAuth redirect URIs (already done in Step 4)

---

## Step 10: Optional - Redirect Old URL

To maintain SEO and help users find the new URL, you can set up a redirect from the old GitHub Pages URL. However, GitHub Pages doesn't support server-side redirects, so you would need to:

1. Keep the old deployment active temporarily, or
2. Use a service like Netlify/Cloudflare for redirects, or
3. Add a meta redirect in the old HTML (not recommended for SEO)

For most cases, you can simply update any links you control and let users discover the new URL naturally.

---

## Troubleshooting

### DNS not resolving?

- Wait up to 48 hours for full propagation
- Double-check DNS records are correct
- Clear your local DNS cache:
  - macOS: `sudo dscacheutil -flushcache`
  - Linux: `sudo systemd-resolve --flush-caches` or `sudo service network-manager restart`
  - Windows: `ipconfig /flushdns`

### SSL certificate not provisioning?

- Wait for DNS to fully propagate first
- Check that your CNAME file is correct
- GitHub may take up to 24 hours to provision SSL
- Verify DNS records point to GitHub Pages IPs

### CORS errors?

- Ensure `CORS_ORIGIN` in backend includes `https://app.fixkod.se`
- Check browser console for exact error
- Verify backend is accessible from the new domain

### 404 errors on routes?

- This is likely a GitHub Pages routing issue
- Ensure you have a `404.html` file that redirects to `index.html`
- Or configure GitHub Pages to use `404.html` as fallback

### Assets not loading?

- Check browser console for 404s
- Verify `homepage` in `package.json` is correct
- Assets should be loaded with absolute paths from root

---

## Quick Checklist

- [ ] Updated `package.json` homepage to `https://app.fixkod.se` ✅
- [ ] Added DNS A records (or CNAME) for `app.fixkod.se` pointing to GitHub Pages
- [ ] Configured custom domain in GitHub Pages settings
- [ ] Verified CNAME file in repository
- [ ] Updated backend CORS_ORIGIN (if applicable)
- [ ] Updated Whoop OAuth redirect URI (if applicable)
- [ ] Updated REACT_APP_API_URL GitHub secret (if applicable)
- [ ] Triggered new frontend deployment
- [ ] Waited for DNS propagation (check with online tools)
- [ ] Verified SSL certificate is provisioned
- [ ] Enabled HTTPS enforcement
- [ ] Tested the new domain in browser
- [ ] Tested API connectivity and login
- [ ] Updated external references to new URL

---

## Need Help?

- **GitHub Pages Docs**: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site
- **DNS Issues**: Contact your DNS provider support
- **GitHub Issues**: Check GitHub Status page or contact GitHub support
