# Quick Fix: Finding DNS Settings in Loopia

Based on the screenshot you shared, here's exactly what to do:

## The Problem

You're currently on the **"Lägg till subdomän"** (Add subdomain) page, but DNS settings are on the **domain settings page**, not the subdomain page.

## Solution: Go to Domain Settings First

### Step 1: Go Back to Domain List

1. Click **"Tillbaka"** (Back) button at the top left, OR
2. Click **"Hem"** (Home) to go back to the dashboard

### Step 2: Click on Your Domain Name

1. Look for a list of your domains
2. Find **`fixkod.se`** (or `healthpuck.se` if that's your domain)
3. **Click directly on the domain name** (not on a subdomain)

### Step 3: Find DNS-Editor

Once you're on the domain's settings page:

1. **Scroll down** - DNS settings are usually lower on the page
2. Look for a section or button that says **"DNS-editor"** (DNS editor)
3. Click on it

You might also see it in:

- Left sidebar menu
- A section titled "DNS" or "DNS-inställningar"

### Step 4: Add DNS Records

In DNS-editor, you can add your A records:

1. Click **"Lägg till record"** (Add record)
2. Select type **A**
3. Enter:
   - **Värdnamn** (Hostname): `app`
   - **IP-adress**: One of the GitHub Pages IPs (see below)
   - **TTL**: `3600`
4. Click **"Lägg till"** (Add)
5. Repeat for all 4 IP addresses

## GitHub Pages IP Addresses

Add these 4 A records (one at a time):

1. `185.199.108.153`
2. `185.199.109.153`
3. `185.199.110.153`
4. `185.199.111.153`

All with:

- Type: **A**
- Name/Värdnamn: **app**
- TTL: **3600**

## Important Notes

### ❌ Don't Use:

- "Avancerad DNS-hantering" (Advanced DNS) - that's a premium upgrade feature
- The subdomain page you're currently on

### ✅ Do Use:

- "DNS-editor" on the main domain settings page
- Basic DNS editing (included in all plans)

## Still Can't Find It?

1. **Try the direct URL method**:
   - Go to: `https://www.loopia.se/customer/dns/?domain=fixkod.se`
   - (Replace `fixkod.se` with your actual domain)

2. **Contact Loopia support**:
   - Email: support@loopia.se
   - Ask: "Var hittar jag DNS-editor för att lägga till DNS-poster?" (Where do I find DNS-editor to add DNS records?)

## Next Steps After Adding DNS Records

1. Wait 1-4 hours for DNS to propagate
2. Check propagation: https://www.whatsmydns.net/#A/app.fixkod.se
3. Configure GitHub Pages custom domain (see [FIXKOD_QUICK_START.md](./FIXKOD_QUICK_START.md))

---

For more detailed instructions, see [LOOPIA_DNS_SETUP.md](./LOOPIA_DNS_SETUP.md)
