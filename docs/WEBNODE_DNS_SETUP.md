# Webnode DNS Setup - Without Transferring Domain

If Webnode is asking you to transfer your domain, you don't need to! Here's how to connect your domain using DNS instead.

---

## ✅ The Solution: DNS Configuration (Not Transfer)

**What you'll do:**

- Keep your domain registered at Loopia ✅
- Connect Webnode to your domain via DNS records ✅
- Still manage all subdomains (app.healthpuck.se, api.healthpuck.se) at Loopia ✅

---

## Step-by-Step Instructions

### Step 1: Find the DNS Option in Webnode

1. Log into your Webnode account
2. Go to: **Settings** → **Domains** → **Manage domains**
3. You'll see a button that says **"Transfer your domain"** - click it
4. **Scroll down** on that page (this is important!)
5. Look for a section that says:
   - **"Can I use my own domain without transferring it to Webnode?"**
   - OR **"Connect domain via DNS"**
   - OR **"Assign domain with DNS settings"**
6. Click the link/button in that section

**Can't find it?**

- Direct link to Webnode's guide: https://www.webnode.com/support/assign-domain-with-dns/
- Or contact Webnode support and say: "I want to connect my domain via DNS without transferring it"

### Step 2: Add Your Domain in Webnode

1. Enter your domain: `www.healthpuck.se` or `healthpuck.se`
2. Click **"Add domain"** or **"Connect domain"**
3. Webnode will now show you DNS records you need to configure

### Step 3: Copy the DNS Records

Webnode will provide you with DNS records like:

- **A records** with IP addresses
- **CNAME records** with hostnames
- Possibly **TXT records** for verification

**Example of what you might see:**

```
Type: A
Name: www
Value: 185.230.63.107
TTL: 3600

OR

Type: CNAME
Name: www
Value: webnode.com
TTL: 3600
```

### Step 4: Add DNS Records in Loopia

1. Log into your **Loopia account**
2. Go to **DNS management** for `healthpuck.se`
3. Add the DNS records exactly as Webnode provided:
   - **Type**: (A, CNAME, or TXT)
   - **Name**: `www` (for www.healthpuck.se)
   - **Value**: (from Webnode)
   - **TTL**: (usually 3600 or default)

### Step 5: Wait for DNS Propagation

- DNS changes can take 1-48 hours (usually < 1 hour)
- Check propagation: https://www.whatsmydns.net/

### Step 6: Verify in Webnode

1. Go back to Webnode's domain management
2. Wait for verification (Webnode will check if DNS is configured correctly)
3. Once verified, set `www.healthpuck.se` as your primary domain

---

## Why This Approach is Better

✅ **Keep domain at Loopia**: Full control of your domain  
✅ **Multiple subdomains**: You can still create `app.healthpuck.se`, `api.healthpuck.se`, etc. at Loopia  
✅ **One place for DNS**: Manage all DNS records at Loopia  
✅ **No transfer fees**: No need to transfer domain ownership  
✅ **Easier management**: All subdomains in one DNS panel

---

## Common Questions

### Q: What if Webnode says "You must transfer the domain"?

**A**: Contact Webnode support. They should allow DNS configuration. If they absolutely require transfer, you might need to:

- Consider if you really need the root domain (`healthpuck.se`) on Webnode
- Use only `www.healthpuck.se` and keep everything else at Loopia
- Look for alternative website builders that support DNS configuration

### Q: Can I use the root domain (healthpuck.se) on Webnode?

**A**: Yes, but you'll need to configure it in DNS. You can also:

- Use `www.healthpuck.se` on Webnode
- Redirect `healthpuck.se` → `www.healthpuck.se` (configured at Loopia)

### Q: Will this affect my app subdomain?

**A**: No! Since you're keeping DNS management at Loopia, you can:

- Point `www.healthpuck.se` → Webnode (via DNS)
- Point `app.healthpuck.se` → Your app (via DNS)
- Point `api.healthpuck.se` → Your backend (via DNS)
- All managed in the same Loopia DNS panel

### Q: Do I need a Premium plan?

**A**: Yes, Webnode typically requires a Premium plan for custom domains. Check their pricing.

---

## Quick Reference

**Domain stays at**: Loopia  
**DNS management**: Loopia  
**Webnode connection**: Via DNS records only  
**What you configure**: DNS records at Loopia pointing to Webnode

---

## Need Help?

- **Webnode Support**: https://www.webnode.com/support/
- **Webnode DNS Guide**: https://www.webnode.com/support/assign-domain-with-dns/
- **Loopia Support**: Contact Loopia for DNS management help
