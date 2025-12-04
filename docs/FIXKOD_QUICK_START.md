# Quick Start: Move to app.fixkod.se

## ✅ Already Done

1. Updated `package.json` homepage to `https://app.fixkod.se`

## 📋 What You Need to Do Next

### 1. Configure DNS (5 minutes)

In your DNS provider for `fixkod.se`, add 4 A records:

```
Type: A
Name: app
Value: 185.199.108.153

Type: A
Name: app
Value: 185.199.109.153

Type: A
Name: app
Value: 185.199.110.153

Type: A
Name: app
Value: 185.199.111.153
```

All with TTL: 3600

**Using Loopia?** See detailed step-by-step instructions: [LOOPIA_DNS_SETUP.md](./LOOPIA_DNS_SETUP.md)

### 2. Configure GitHub Pages (2 minutes)

1. Go to: GitHub repo → **Settings** → **Pages**
2. Under **Custom domain**, enter: `app.fixkod.se`
3. Click **Save**
4. GitHub will automatically create a CNAME file and provision SSL

### 3. Update Backend (if you have one)

If your backend needs to allow the new domain:

```bash
cd backend
fly secrets set CORS_ORIGIN=https://app.fixkod.se
```

### 4. Wait & Test

- Wait 1-4 hours for DNS to propagate
- Check DNS: https://www.whatsmydns.net/#A/app.fixkod.se
- Visit: https://app.fixkod.se

### 5. Enable HTTPS

Once SSL is ready (check GitHub Pages settings):

- Enable **Enforce HTTPS** checkbox

---

## 📖 Full Guides

- **Loopia DNS Setup**: Step-by-step instructions for Loopia's interface → [LOOPIA_DNS_SETUP.md](./LOOPIA_DNS_SETUP.md)
- **Complete Migration Guide**: Detailed instructions and troubleshooting → [MIGRATE_TO_FIXKOD.md](./MIGRATE_TO_FIXKOD.md)
