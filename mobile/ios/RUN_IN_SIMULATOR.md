# How to Run in iOS Simulator

## In Xcode (Visual Method)

### Step 1: Select a Simulator
1. Look at the **top toolbar** in Xcode
2. Find the device selector - it currently says **"Any iOS Device (arm64)"**
3. **Click on it** to open the dropdown menu
4. You'll see sections:
   - **"iOS Simulators"** (this is what you want!)
   - "My Mac"
   - "Any iOS Device"
5. Under **"iOS Simulators"**, you'll see a list like:
   - iPhone 15 Pro
   - iPhone 15
   - iPhone 14 Pro
   - iPhone 14
   - etc.
6. **Click on any iPhone simulator** (e.g., "iPhone 15 Pro")

### Step 2: Run the App
- Once a simulator is selected, click the **Play button (▶)** in the top toolbar
- Xcode will:
  1. Build the app (first time takes 5-15 minutes)
  2. Launch the iOS Simulator automatically
  3. Install and run your app

## Using Terminal (Alternative Method)

You can also run directly from terminal:

```bash
cd /Users/tomas/repos/Healthpuck/mobile
npm run ios
```

This will:
- Start Metro bundler (JavaScript bundler)
- Build the iOS app
- Launch the simulator automatically
- Install and run your app

### Run on Specific Simulator

To choose a specific simulator:

```bash
# List available simulators
xcrun simctl list devices available

# Run on specific simulator
npm run ios -- --simulator="iPhone 15 Pro"
```

## Troubleshooting

### No Simulators Available?

If you don't see any simulators:
1. In Xcode menu: **Xcode → Settings** (or **Preferences**)
2. Go to **"Platforms"** or **"Components"** tab
3. Download iOS Simulator if needed
4. Or install via terminal: `xcodebuild -downloadPlatform iOS`

### Simulator Won't Start?

- Make sure Xcode is fully installed (not just command line tools)
- Try restarting Xcode
- Check if simulators are installed: `xcrun simctl list devices`

### Still Getting "No supported devices"?

- Make sure you selected a simulator, not "Any iOS Device"
- Try: **Product → Destination → iOS Simulator → iPhone 15 Pro**

## Quick Steps Summary

1. **Click device selector** (top toolbar, currently shows "Any iOS Device")
2. **Select any iPhone simulator** from "iOS Simulators" section
3. **Click Play button (▶)** to build and run

That's it! The simulator will launch automatically.

