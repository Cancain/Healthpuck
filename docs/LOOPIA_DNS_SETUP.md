# How to Configure DNS Records in Loopia

This guide shows you step-by-step how to add DNS records in Loopia's control panel to point `app.fixkod.se` to GitHub Pages.

---

## ⚠️ Important: Where to Find DNS Settings

**Key Points:**

1. You must click on the **domain name** first (e.g., `fixkod.se` or `healthpuck.se`)
2. **NOT** on a subdomain page (like "Lägg till subdomän")
3. After clicking the domain, scroll down and look for **"DNS-editor"**
4. Don't worry about "Avancerad DNS-hantering" (Advanced DNS) - that's a premium feature you don't need

**You're currently on:** A subdomain page ("Lägg till subdomän")  
**You need to go to:** The main domain settings page, then find "DNS-editor"

---

## Step 1: Log into Loopia

1. Go to https://www.loopia.se/
2. Click **"Logga in"** (Log in) in the top right
3. Enter your Loopia username and password

---

## Step 2: Navigate to DNS Management

**Important**: You need to click on your domain name FIRST, then find "DNS-editor" on that domain's page.

### Step 2.1: Click on Your Domain

1. Look for a section called **"Domäner"** (Domains) or **"Mina domäner"** (My domains) on the dashboard
2. Find your domain `fixkod.se` (or `healthpuck.se` if that's what you're using)
3. **Click directly on the domain name** - this will take you to that domain's settings page

### Step 2.2: Find DNS-Editor

Once you're on the domain's settings page:

1. **Scroll down** on the page (DNS settings are usually further down)
2. Look for a section or link that says:
   - **"DNS-editor"** (DNS editor) - This is what you need!
   - **"DNS-redigering"** (DNS editing)
   - **"DNS-hantering"** (DNS management)
3. **Click on "DNS-editor"** (or similar)

**Note**: Don't confuse this with "Avancerad DNS-hantering" (Advanced DNS management) which appears in the sidebar as an upgrade feature. You don't need that - the basic "DNS-editor" is included in all plans.

### Alternative: Direct Access

If you know your domain, try this direct URL pattern:

- `https://www.loopia.se/customer/dns/?domain=fixkod.se`
- Or look for "DNS" in the left sidebar menu after clicking your domain

---

## Step 3: Add DNS A Records for app.fixkod.se

You need to add **4 A records** pointing to GitHub Pages. In Loopia's interface:

### Finding the "Add Record" Button

Look for one of these buttons/links:

- **"Lägg till post"** (Add record)
- **"Ny post"** (New record)
- **"Add"** or **"Create"**
- A **"+"** button
- **"Redigera"** (Edit) button that lets you add records

### Adding Each A Record

You'll need to add **4 separate A records**, one for each IP address:

#### Record 1:

- **Typ** (Type): Select **A** from dropdown
- **Namn** (Name) / **Subdomän** (Subdomain): Enter `app`
- **Värde** (Value) / **Pekar på** (Points to) / **Mål** (Target): Enter `185.199.108.153`
- **TTL**: `3600` (or leave as default)
- Click **"Spara"** (Save) or **"Lägg till"** (Add)

#### Record 2:

- **Typ** (Type): **A**
- **Namn** (Name): `app`
- **Värde** (Value): `185.199.109.153`
- **TTL**: `3600`
- Click **"Spara"** (Save)

#### Record 3:

- **Typ** (Type): **A**
- **Namn** (Name): `app`
- **Värde** (Value): `185.199.110.153`
- **TTL**: `3600`
- Click **"Spara"** (Save)

#### Record 4:

- **Typ** (Type): **A**
- **Namn** (Name): `app`
- **Värde** (Value): `185.199.111.153`
- **TTL**: `3600`
- Click **"Spara"** (Save)

### Important Notes:

- Some Loopia interfaces allow multiple IP addresses in a single A record (multiple values). If you see this option, you can add all 4 IPs to one record instead.
- The **Name** field might be labeled as:
  - **"Namn"** (Name)
  - **"Subdomän"** (Subdomain)
  - **"Host"** or **"Hostname"**
  - Leave blank or enter `@` for root domain (don't do this - we need `app`)

---

## Step 4: Verify Your Records

After adding all 4 records, you should see something like this in your DNS records list:

```
Type    Name    Value              TTL
A       app     185.199.108.153    3600
A       app     185.199.109.153    3600
A       app     185.199.110.153    3600
A       app     185.199.111.153    3600
```

---

## Step 5: Save Changes

Make sure to:

1. Click any **"Spara alla ändringar"** (Save all changes) button if present
2. Confirm the changes if prompted

---

## Alternative: Using CNAME (If Loopia Supports It)

Some DNS providers prefer CNAME for GitHub Pages. If Loopia allows CNAME for subdomains:

### CNAME Record:

- **Typ** (Type): Select **CNAME** from dropdown
- **Namn** (Name): `app`
- **Värde** (Value) / **Pekar på** (Points to): Enter `cancain.github.io` (your GitHub Pages URL without the path)
- **TTL**: `3600`
- Click **"Spara"** (Save)

**Note**: GitHub Pages officially recommends A records, but CNAME also works. If your Loopia interface makes CNAME easier, you can use it.

---

## Troubleshooting: Can't Find DNS Settings?

### Common Issues:

#### "I see 'Avancerad DNS-hantering' in the sidebar but it's greyed out"

**Solution**: That's an upgrade feature - you don't need it! Look for **"DNS-editor"** on the domain's settings page instead. Scroll down after clicking your domain name.

#### "I'm on the subdomain page, not the domain page"

**Solution**: Go back to the main domain (`fixkod.se` or `healthpuck.se`), not a subdomain. DNS records are managed at the domain level.

#### "I can't find DNS-editor anywhere"

Try these steps:

1. Make sure you clicked on the **domain name** first (not a subdomain)
2. **Scroll down** on the domain settings page - DNS-editor might be further down
3. Look in the left sidebar menu for "DNS" or "DNS-editor"
4. Check if there's a "Hantera" (Manage) button on the domain list that takes you to DNS settings

### Still Stuck? Contact Loopia Support

If you still can't find DNS settings:

- **Email**: support@loopia.se
- **Live chat**: Available on https://www.loopia.se/
- **Ask in Swedish**: "Jag hittar inte DNS-editor för min domän. Var hittar jag den?" (I can't find DNS-editor for my domain. Where do I find it?)
- **Or ask in English**: "Where do I find DNS-editor to add DNS records for my domain?"

### Swedish Terms You Might See:

- **DNS-editor** = DNS editor (this is what you need!)
- **DNS-hantering** = DNS management
- **DNS-redigering** = DNS editing
- **Domäner** = Domains
- **Lägg till post** = Add record
- **Hantera** = Manage
- **Avancerad DNS-hantering** = Advanced DNS management (premium feature - you don't need this)

---

## After Adding DNS Records

1. **Wait for propagation**: 1-4 hours (sometimes up to 48 hours)
2. **Check DNS propagation**:
   - https://www.whatsmydns.net/#A/app.fixkod.se
   - https://dnschecker.org/#A/app.fixkod.se
3. **Configure GitHub Pages**: Go to your repo → Settings → Pages → Custom domain → Enter `app.fixkod.se`
4. **Wait for SSL**: GitHub will automatically provision SSL certificate (usually within a few hours)

---

## Visual Guide (What You Might See)

### Loopia DNS Interface Example:

```
┌─────────────────────────────────────────┐
│  DNS-hantering för fixkod.se            │
├─────────────────────────────────────────┤
│                                         │
│  [Lägg till post] [+ Ny post]          │
│                                         │
│  Befintliga poster:                    │
│  ┌──────────────────────────────────┐  │
│  │ Typ │ Namn │ Värde      │ TTL  │  │
│  ├─────┼──────┼────────────┼───────┤  │
│  │ A   │ @    │ 1.2.3.4    │ 3600 │  │
│  │ MX  │ @    │ mail...    │ 3600 │  │
│  └──────────────────────────────────┘  │
│                                         │
│  [Spara alla ändringar]                │
└─────────────────────────────────────────┘
```

### Add Record Form Example:

```
┌─────────────────────────────────────┐
│  Lägg till DNS-post                 │
├─────────────────────────────────────┤
│  Typ:    [A ▼]                      │
│  Namn:   [app____]                  │
│  Värde:  [185.199.108.153____]     │
│  TTL:    [3600____]                 │
│                                     │
│  [Spara]  [Avbryt]                 │
└─────────────────────────────────────┘
```

---

## Quick Reference: GitHub Pages IPs

For `app.fixkod.se`, use these 4 IP addresses:

1. `185.199.108.153`
2. `185.199.109.153`
3. `185.199.110.153`
4. `185.199.111.153`

All with:

- **Type**: A
- **Name**: `app`
- **TTL**: 3600

---

## Need More Help?

- **Loopia Support**: https://www.loopia.se/support/
- **Loopia Documentation**: Check their help/knowledge base
- **Email Support**: support@loopia.se

---

**Next Steps**: After adding DNS records, see [FIXKOD_QUICK_START.md](./FIXKOD_QUICK_START.md) for configuring GitHub Pages.
