# How to Configure Signing in Xcode - Step by Step

## Step 1: Select the Project (Blue Icon)

1. In the **left sidebar** (Project Navigator), look at the very top
2. You should see a **blue icon** with "Healthpuck" next to it
3. **Click once** on that blue "Healthpuck" icon (the project, not the folder)
   - This is the project file, not the folder

## Step 2: View the Main Editor Area

After clicking the blue project icon:
- The **main area** (center/right) will show project settings
- You should now see tabs: **General**, **Signing & Capabilities**, **Info**, etc.
- On the **left side of the main area**, you'll see:
  - **PROJECT** section (with "Healthpuck")
  - **TARGETS** section (with "Healthpuck" and "HealthpuckTests")

## Step 3: Select the Target

1. In the **TARGETS** section (left side of main area), click on **"Healthpuck"**
   - NOT "HealthpuckTests" - that's for tests only
   - Click on the main "Healthpuck" target

## Step 4: Configure Signing

1. With "Healthpuck" target selected, click the **"Signing & Capabilities"** tab at the top
2. You should see:
   - **Team**: Dropdown (probably says "None" or "Add an Account...")
   - **Bundle Identifier**: `com.healthpuck.app`
   - **Signing Certificate**: (will be set automatically)
3. **Click the Team dropdown** and:
   - If you see your name/email: Select it
   - If you see "Add an Account...": Click it, sign in with Apple ID
4. **Check the box**: "Automatically manage signing" ✅

## Visual Guide

```
┌─────────────────────────────────────────────┐
│ Left Sidebar          │ Main Editor Area   │
│                        │                    │
│ 🔨 Healthpuck  ← Click│ PROJECT            │
│   📁 Healthpuck       │   Healthpuck      │
│   📁 Libraries         │                    │
│   📁 Pods              │ TARGETS            │
│                        │   Healthpuck ← Click this
│                        │   HealthpuckTests  │
│                        │                    │
│                        │ [General] [Signing & Capabilities] ← Click this
│                        │                    │
│                        │ Team: [None ▼] ← Select here
│                        │ Bundle ID: com.healthpuck.app
└─────────────────────────────────────────────┘
```

## If You Still Don't See TARGETS

1. Make sure you clicked the **blue project icon** (🔨), not the gray folder
2. The main editor area should show project settings (not code)
3. If you see code files, you're in the wrong view - click the blue project icon again

## Quick Checklist

- [ ] Clicked blue "Healthpuck" icon (project, not folder)
- [ ] Main area shows project settings (not code)
- [ ] See "TARGETS" section in main area
- [ ] Clicked "Healthpuck" under TARGETS
- [ ] Clicked "Signing & Capabilities" tab
- [ ] Selected Team from dropdown


