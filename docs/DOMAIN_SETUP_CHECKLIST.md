# Domain Setup Quick Checklist

Quick reference for setting up `www.healthpuck.se` (Webnode) and `app.healthpuck.se` (your app).

---

## ⚠️ IMPORTANT: Don't Transfer Your Domain!

**DO NOT transfer your domain from Loopia to Webnode.** You need to use DNS configuration instead so you can:

- Keep control of your domain at Loopia
- Configure multiple subdomains (www, app, api, etc.)
- Manage all DNS records in one place

If Webnode asks you to transfer:

1. Look for option: **"Can I use my own domain without transferring it to Webnode?"**
2. Or search for: **"Connect domain via DNS"** or **"Assign domain with DNS"**
3. This keeps your domain at Loopia but connects it to Webnode via DNS

---

## 🎯 Your Goal

- `www.healthpuck.se` → Webnode marketing site
- `app.healthpuck.se` → Healthpuck application

---

## ✅ Step-by-Step Checklist

### Part 1: Webnode Marketing Site (www.healthpuck.se)

⚠️ **IMPORTANT**: Do NOT transfer your domain to Webnode. Use DNS configuration instead!

- [ ] **1.1** Log into Webnode account
- [ ] **1.2** Go to Settings → Domains → Manage domains
- [ ] **1.3** Click "Transfer your domain" button
- [ ] **1.4** Scroll down and find section: "Can I use my own domain without transferring it to Webnode?"
- [ ] **1.5** Click the link in that section
- [ ] **1.6** Enter domain: `www.healthpuck.se` (or `healthpuck.se`)
- [ ] **1.7** Click "Add domain" or "Connect domain"
- [ ] **1.8** Webnode will show you DNS records needed (CNAME or A record)
- [ ] **1.9** Note down the DNS values Webnode provides

**If you can't find the DNS option**:

- Look for "Connect domain via DNS" or "Assign domain with DNS"
- Check Webnode help: https://www.webnode.com/support/assign-domain-with-dns/
- Contact Webnode support asking for DNS configuration instructions

- [ ] **1.6** Log into Loopia (your domain registrar)
- [ ] **1.7** Go to DNS management for `healthpuck.se`
- [ ] **1.8** Add DNS record for `www` subdomain:
  - Type: CNAME (or A record if Webnode says so)
  - Name: `www`
  - Value: (from Webnode)
  - TTL: 3600

- [ ] **1.9** (Optional) Add redirect for root domain:
  - Type: CNAME
  - Name: `@` (or blank for root)
  - Value: `www.healthpuck.se`
  - This makes `healthpuck.se` → `www.healthpuck.se`

- [ ] **1.10** Wait for DNS propagation (can take 1-48 hours, usually < 1 hour)
- [ ] **1.11** Verify: Visit `www.healthpuck.se` in browser

---

### Part 2: Backend API Domain

Choose one approach:

#### Option A: Separate API Subdomain (Recommended)

```
app.healthpuck.se  → Frontend
api.healthpuck.se  → Backend API
```

- [ ] **2A.1** Add API subdomain in Fly.io:

  ```bash
  cd backend
  fly domains add api.healthpuck.se
  ```

- [ ] **2A.2** Fly.io will show DNS records to add (usually CNAME)
- [ ] **2A.3** Add DNS record in Loopia:
  - Type: CNAME
  - Name: `api`
  - Value: (from Fly.io output, usually `backend-hidden-butterfly-2266.fly.dev`)

- [ ] **2A.4** Verify domain:
  ```bash
  fly domains verify api.healthpuck.se
  ```

#### Option B: Same Domain for Everything

```
app.healthpuck.se  → Frontend + Backend (backend serves frontend)
```

- [ ] **2B.1** Add app subdomain in Fly.io:

  ```bash
  cd backend
  fly domains add app.healthpuck.se
  ```

- [ ] **2B.2** Add DNS record in Loopia as shown by Fly.io
- [ ] **2B.3** Update backend to serve frontend static files (requires code changes)

---

### Part 3: Frontend Domain (app.healthpuck.se)

#### If using GitHub Pages:

- [ ] **3.1** Log into GitHub → Your repo → Settings → Pages
- [ ] **3.2** Under "Custom domain", enter: `app.healthpuck.se`
- [ ] **3.3** GitHub will show DNS records (usually A records with IPs)
- [ ] **3.4** Add DNS records in Loopia as GitHub shows
- [ ] **3.5** Wait for DNS propagation
- [ ] **3.6** GitHub will automatically generate SSL certificate (can take a few hours)

#### If using separate API subdomain:

- [ ] **3.7** Set `REACT_APP_API_URL` in GitHub Actions secrets:
  - Go to GitHub repo → Settings → Secrets and variables → Actions
  - Add: `REACT_APP_API_URL` = `https://api.healthpuck.se`

- [ ] **3.8** Trigger a new deployment (push to main or manually trigger workflow)

---

### Part 4: Update Backend Configuration

- [ ] **4.1** Update Fly.io secrets with new domain:

  ```bash
  cd backend
  fly secrets set \
    CORS_ORIGIN=https://app.healthpuck.se \
    WHOOP_REDIRECT_URI=https://api.healthpuck.se/api/integrations/whoop/callback
  ```

  (Use `app.healthpuck.se` for both if using same domain approach)

- [ ] **4.2** Verify secrets:
  ```bash
  fly secrets list
  ```

---

### Part 5: Update Whoop OAuth Settings

- [ ] **5.1** Log into [Whoop Developer Portal](https://developer.whoop.com)
- [ ] **5.2** Find your OAuth application
- [ ] **5.3** Update redirect URI:
  - Old: `https://<old-domain>/api/integrations/whoop/callback`
  - New: `https://api.healthpuck.se/api/integrations/whoop/callback`
    (or `https://app.healthpuck.se/api/integrations/whoop/callback` if same domain)

- [ ] **5.4** Save changes

---

### Part 6: Testing

- [ ] **6.1** Test `www.healthpuck.se` → Should show Webnode site
- [ ] **6.2** Test `app.healthpuck.se` → Should show your React app
- [ ] **6.3** Test API endpoint → `https://api.healthpuck.se/health` (or `app.healthpuck.se/api/health`)
- [ ] **6.4** Test login functionality
- [ ] **6.5** Test Whoop OAuth connection
- [ ] **6.6** Check browser console for any CORS errors

---

## 🔍 DNS Propagation Check

Use these tools to check if DNS has propagated:

- https://www.whatsmydns.net/
- https://dnschecker.org/

---

## 📝 Current Configuration Reference

- **Domain registrar**: Loopia
- **Domain**: healthpuck.se
- **Backend Fly.io app**: `backend-hidden-butterfly-2266`
- **Backend URL (current)**: `backend-hidden-butterfly-2266.fly.dev`
- **Frontend (current)**: GitHub Pages

---

## 🆘 Common Issues

**DNS not resolving?**

- Wait up to 48 hours (usually much faster)
- Double-check DNS records in Loopia are correct
- Clear your DNS cache

**SSL certificate issues?**

- Wait for DNS to fully propagate first
- Fly.io and GitHub Pages auto-generate SSL certs
- Check domain verification status in Fly.io: `fly domains list`

**CORS errors?**

- Verify `CORS_ORIGIN` in Fly.io secrets matches exactly (including https://)
- Check browser console for exact error message

**OAuth redirect errors?**

- Ensure Whoop redirect URI matches exactly (including path)
- Check backend logs for OAuth errors

---

For detailed instructions, see [DOMAIN_SETUP.md](./DOMAIN_SETUP.md)
