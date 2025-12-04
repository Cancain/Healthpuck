# Domain Setup Guide for healthpuck.se

This guide will walk you through setting up:

- `www.healthpuck.se` → Webnode marketing website
- `app.healthpuck.se` → Healthpuck application (frontend + backend API)

## Overview

- **Domain registrar**: Loopia (healthpuck.se)
- **Marketing site**: Webnode
- **Backend**: Fly.io (app: `backend-hidden-butterfly-2266`)
- **Frontend**: Currently GitHub Pages (may need to switch)

---

## Step 1: Configure DNS in Loopia

Log into your Loopia account and navigate to DNS management for `healthpuck.se`.

### DNS Records Needed

You'll need to add the following DNS records:

#### For www.healthpuck.se (Webnode marketing site):

1. **A Record** (or CNAME - Webnode will tell you which):
   - **Type**: CNAME
   - **Name**: `www`
   - **Value**: (Webnode will provide this, typically something like `webnode.com` or a specific hostname)
   - **TTL**: 3600 (or default)

   OR if they need an A record:
   - **Type**: A
   - **Name**: `www`
   - **Value**: (IP address provided by Webnode)
   - **TTL**: 3600

2. **Root domain redirect** (optional but recommended):
   - **Type**: CNAME
   - **Name**: `@` (or leave blank for root)
   - **Value**: `www.healthpuck.se`
   - **TTL**: 3600

   This makes `healthpuck.se` redirect to `www.healthpuck.se`

#### For app.healthpuck.se (Your application):

1. **CNAME Record for subdomain**:
   - **Type**: CNAME
   - **Name**: `app`
   - **Value**: (You have two options - see below)
   - **TTL**: 3600

**Option A: Point directly to Fly.io backend** (if backend will serve frontend too):

- **Value**: `backend-hidden-butterfly-2266.fly.dev`

**Option B: Use separate domains** (recommended - frontend and backend separate):

- Create separate CNAME records (see below)

---

## Step 2: Get Webnode Configuration Details (WITHOUT Transferring Domain)

**IMPORTANT**: You do NOT need to transfer your domain from Loopia to Webnode. You can use DNS configuration instead.

1. Log into your Webnode account
2. Go to your website's **Settings** → **Domains** → **Manage domains**
3. Click on **"Transfer your domain"** (yes, click this button)
4. Scroll down on that page and look for a section that says:
   - **"Can I use my own domain without transferring it to Webnode?"**
   - OR **"Connect domain via DNS"**
   - OR similar option
5. Click the link/button in that section
6. Enter your domain: `www.healthpuck.se` (or just `healthpuck.se`)
7. Click **"Add domain"** or **"Connect domain"**

Webnode will then provide you with DNS records to configure at Loopia:

- Either **CNAME records** to point to
- Or **A records** with IP addresses
- They may also provide verification TXT records

**What to add in Loopia DNS:**

- Add the DNS records Webnode provides (usually for `www` subdomain)
- You can keep your domain registered at Loopia
- You'll still manage all DNS records at Loopia, including subdomains like `app.healthpuck.se`

**Note**:

- DNS changes can take 24-48 hours to propagate, though usually much faster
- Using a custom domain with Webnode requires an active Premium Plan
- You keep full control of your domain at Loopia and can configure other subdomains

---

## Step 3: Configure Fly.io Custom Domain

For your backend API at `app.healthpuck.se`:

### Option 1: Backend only (app.healthpuck.se → API)

1. **Add custom domain to Fly.io**:

```bash
cd backend
fly domains add app.healthpuck.se
```

This will:

- Create DNS records you need to add (CNAME or A records)
- Configure SSL certificates automatically

2. **Add the DNS record in Loopia**:
   - Fly.io will output a CNAME record value like: `_acme-challenge.app.healthpuck.se CNAME <value>.fly.dev`
   - Add this to your Loopia DNS

3. **Verify domain**:

```bash
fly domains verify app.healthpuck.se
```

### Option 2: Full app subdomain (app.healthpuck.se → Frontend + Backend)

If you want `app.healthpuck.se` to serve your frontend and the backend API at `app.healthpuck.se/api/*`:

You have a few architectural choices:

**A. Use Fly.io to serve both (recommended)**:

- Deploy frontend as static files to Fly.io
- Backend serves frontend at root and API at `/api/*`
- Single domain, single SSL cert

**B. Use separate subdomains**:

- `app.healthpuck.se` → Frontend (GitHub Pages or other hosting)
- `api.healthpuck.se` → Backend API (Fly.io)

**C. Use reverse proxy**:

- `app.healthpuck.se` → Fly.io app that proxies frontend and backend

---

## Step 4: Update Application Configuration

Once DNS is configured, update your application settings:

### Backend Environment Variables

Update Fly.io secrets:

```bash
cd backend
fly secrets set \
  CORS_ORIGIN=https://app.healthpuck.se \
  WHOOP_REDIRECT_URI=https://app.healthpuck.se/api/integrations/whoop/callback
```

Or if using separate API subdomain:

```bash
fly secrets set \
  CORS_ORIGIN=https://app.healthpuck.se \
  WHOOP_REDIRECT_URI=https://api.healthpuck.se/api/integrations/whoop/callback
```

### Frontend Configuration

Your frontend uses the `REACT_APP_API_URL` environment variable. Update it in your GitHub Actions workflow:

1. **For GitHub Pages deployment**, update `.github/workflows/frontend-gh-pages.yml`:

   ```yaml
   - name: Build
     env:
       REACT_APP_API_URL: https://api.healthpuck.se # or app.healthpuck.se if same domain
     run: npm run build
   ```

2. **Or set it as a GitHub secret**:
   - Go to GitHub repo → Settings → Secrets and variables → Actions
   - Add secret: `REACT_APP_API_URL` = `https://api.healthpuck.se`
   - The workflow already references it as `${{ secrets.REACT_APP_API_URL }}`

3. **Frontend code locations using API_BASE**:
   - `src/auth/AuthContext.tsx` (line 14)
   - `src/pages/Login/Login.tsx` (line 8)
   - `src/pages/Register/Register.tsx` (line 8)
   - `src/pages/Settings/Settings.tsx` (line 9)
   - `src/utils/heartRateWebSocket.ts` (line 27)
   - All use: `process.env.REACT_APP_API_URL || "http://localhost:3001"`

### Update Whoop OAuth Settings

1. Log into [Whoop Developer Portal](https://developer.whoop.com)
2. Update your OAuth application's redirect URI:
   - From: `https://<old-domain>/api/integrations/whoop/callback`
   - To: `https://app.healthpuck.se/api/integrations/whoop/callback` (or `api.healthpuck.se` if separate)

---

## Step 5: Recommended Architecture

For the cleanest setup, I recommend:

```
www.healthpuck.se      → Webnode marketing site (CNAME to Webnode)
app.healthpuck.se      → Frontend (React app - GitHub Pages or Fly.io static)
api.healthpuck.se      → Backend API (Fly.io - CNAME to backend-hidden-butterfly-2266.fly.dev)
```

**DNS Records in Loopia**:

```
Type    Name    Value
CNAME   www     → (Webnode hostname)
CNAME   @       → www.healthpuck.se (redirect root to www)
CNAME   app     → (GitHub Pages or other frontend host)
CNAME   api     → backend-hidden-butterfly-2266.fly.dev
```

Then in Fly.io:

```bash
cd backend
fly domains add api.healthpuck.se
```

---

## Step 6: Frontend Hosting Options

Your frontend is currently on GitHub Pages. For `app.healthpuck.se`, you have:

### Option A: Keep GitHub Pages + Custom Domain

1. In GitHub repo settings → Pages:
   - Set custom domain to `app.healthpuck.se`
   - GitHub will provide DNS records to add (usually A records for IPs)

2. Add DNS records in Loopia as GitHub instructs

3. Wait for DNS propagation and SSL certificate generation

### Option B: Deploy Frontend to Fly.io

1. Serve static files from Fly.io backend
2. Update backend to serve `build/` directory for non-API routes
3. Use single domain `app.healthpuck.se` for everything

### Option C: Use Netlify/Vercel

1. Deploy frontend to Netlify or Vercel
2. Add custom domain `app.healthpuck.se`
3. Follow their DNS setup instructions

---

## Step 7: Testing DNS Propagation

After adding DNS records:

1. **Check DNS propagation**:

   ```bash
   # Check www subdomain
   dig www.healthpuck.se

   # Check app subdomain
   dig app.healthpuck.se

   # Check API subdomain (if separate)
   dig api.healthpuck.se
   ```

2. **Online tools**:
   - [whatsmydns.net](https://www.whatsmydns.net/)
   - [dnschecker.org](https://dnschecker.org/)

3. **Test HTTPS**:
   - Once DNS propagates, test in browser
   - SSL certificates should auto-generate (Fly.io, GitHub Pages, etc.)

---

## Step 8: Final Checklist

- [ ] DNS records added in Loopia for `www.healthpuck.se` → Webnode
- [ ] DNS records added in Loopia for `app.healthpuck.se` → Frontend
- [ ] DNS records added in Loopia for backend (either `app.healthpuck.se` or `api.healthpuck.se`) → Fly.io
- [ ] Custom domain configured in Webnode
- [ ] Custom domain configured in Fly.io (`fly domains add`)
- [ ] Backend environment variables updated (CORS_ORIGIN, WHOOP_REDIRECT_URI)
- [ ] Frontend API configuration updated
- [ ] Whoop OAuth redirect URI updated in developer portal
- [ ] DNS propagation verified (24-48 hours)
- [ ] SSL certificates verified (auto-generated)
- [ ] All domains tested in browser

---

## Troubleshooting

### Webnode is asking to transfer domain

**You don't need to transfer!** Here's how to avoid it:

1. In Webnode's domain setup, look for a section that says:
   - "Can I use my own domain without transferring it to Webnode?"
   - "Connect domain via DNS"
   - "Assign domain with DNS settings"

2. If you can't find it:
   - Look in the help section: https://www.webnode.com/support/assign-domain-with-dns/
   - Or contact Webnode support and ask: "How do I connect my domain via DNS without transferring it?"

3. **Important**: If you transfer the domain to Webnode:
   - You'll lose control of DNS at Loopia
   - You may not be able to configure subdomains like `app.healthpuck.se`
   - You'll need to manage everything through Webnode's DNS interface

**Solution**: Use DNS configuration instead of transfer. This keeps your domain at Loopia where you can configure multiple subdomains.

### DNS not resolving

- Wait 24-48 hours for propagation
- Check DNS records are correctly typed in Loopia
- Clear DNS cache: `sudo dscacheutil -flushcache` (macOS) or `ipconfig /flushdns` (Windows)

### SSL certificate issues

- Fly.io auto-generates certs - check with `fly domains list`
- GitHub Pages may need manual SSL enable in settings
- Wait for DNS to fully propagate before SSL can verify
- Webnode will handle SSL for their domain automatically

### CORS errors

- Ensure `CORS_ORIGIN` in Fly.io secrets matches exact frontend URL
- Include protocol: `https://app.healthpuck.se` (not just `app.healthpuck.se`)
- Check browser console for exact CORS error

### OAuth redirect errors

- Verify Whoop redirect URI matches exactly (including protocol and path)
- Check backend logs for OAuth callback errors
- Ensure backend is accessible at the configured domain

---

## Need Help?

- **Loopia DNS**: Check Loopia documentation or support
- **Webnode**: Contact Webnode support for custom domain setup
- **Fly.io**: `fly help domains` or [Fly.io docs](https://fly.io/docs/)
- **GitHub Pages**: [GitHub Pages custom domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
