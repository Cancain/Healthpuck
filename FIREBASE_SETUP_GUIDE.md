# Firebase Push Notifications - Complete Setup Guide

This guide will walk you through setting up Firebase Cloud Messaging (FCM) for push notifications in the Healthpuck app.

## Prerequisites

- Google account
- Firebase Console access (https://console.firebase.google.com/)
- Android Studio (for Android setup)
- Xcode (for iOS setup, macOS only)

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `healthpuck` (or your preferred name)
4. Click **Continue**
5. **Disable Google Analytics** (optional, not needed for FCM) or enable if you want it
6. Click **Create project**
7. Wait for project creation, then click **Continue**

---

TODO: IOS emergency push notice

## Step 2: Backend Setup (Firebase Admin SDK)

### 2.1 Generate Service Account Key

1. In Firebase Console, click the **gear icon** ⚙️ next to "Project Overview"
2. Select **"Project settings"**
3. Go to **"Service accounts"** tab
4. Click **"Generate new private key"**
5. A JSON file will download - **save this file securely** (e.g., `firebase-service-account.json`)
6. **DO NOT commit this file to git** - it contains sensitive credentials

### 2.2 Configure Backend Environment Variable

You have two options:

**Option A: JSON String (Recommended for production)**

```bash
# Read the JSON file and set as environment variable
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id",...}'
```

**Option B: File Path (Easier for development)**

```bash
# Set path to the JSON file
export FIREBASE_SERVICE_ACCOUNT_KEY=/path/to/firebase-service-account.json
```

**For permanent setup, add to your `.env` file:**

```bash
# In backend/.env
FIREBASE_SERVICE_ACCOUNT_KEY=/absolute/path/to/firebase-service-account.json
```

### 2.3 Verify Backend Setup

1. Start your backend server:

   ```bash
   cd backend
   bun run dev
   ```

2. Check logs for:

   ```
   [Notification Service] Firebase initialized successfully
   ```

   If you see a warning instead, the environment variable is not set correctly.

---

## Step 3: Android Setup

### 3.1 Add Android App to Firebase

1. In Firebase Console, click **"Add app"** or the Android icon
2. Enter package name: `com.healthpuck`
   - This must match your `android/app/build.gradle` `applicationId`
3. Enter app nickname (optional): `Healthpuck Android`
4. Click **"Register app"**

### 3.2 Download Configuration File

1. Download `google-services.json`
2. **Copy the file** to: `mobile/android/app/google-services.json`

   ```bash
   # Example command
   cp ~/Downloads/google-services.json mobile/android/app/
   ```

3. **Verify the file is in the correct location:**
   ```bash
   ls mobile/android/app/google-services.json
   ```

### 3.3 Verify Android Configuration

The following should already be configured (check if present):

**`mobile/android/build.gradle`:**

```gradle
dependencies {
    classpath("com.google.gms:google-services:4.4.0")
}
```

**`mobile/android/app/build.gradle`:**

```gradle
apply plugin: "com.google.gms.google-services"
```

**`mobile/android/app/src/main/AndroidManifest.xml`:**

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### 3.4 Rebuild Android App

```bash
cd mobile/android
./gradlew clean
cd ../..
npm run android
```

---

## Step 4: iOS Setup

### 4.1 Add iOS App to Firebase

1. In Firebase Console, click **"Add app"** or the iOS icon
2. Enter bundle ID: Check your `mobile/ios/Healthpuck/Info.plist` for `CFBundleIdentifier`
   - Usually: `com.healthpuck` or similar
3. Enter app nickname (optional): `Healthpuck iOS`
4. Click **"Register app"**

### 4.2 Download Configuration File

1. Download `GoogleService-Info.plist`
2. **Copy the file** to: `mobile/ios/Healthpuck/GoogleService-Info.plist`
   ```bash
   # Example command
   cp ~/Downloads/GoogleService-Info.plist mobile/ios/Healthpuck/
   ```

### 4.3 Configure APNs (Apple Push Notification Service)

**Important:** iOS requires APNs certificates for push notifications.

1. In Firebase Console, go to **Project Settings** → **Cloud Messaging** tab
2. Under **"Apple app configuration"**, click **"Upload"** next to APNs Authentication Key
3. You have two options:

   **Option A: APNs Authentication Key (Recommended)**
   - Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
   - Create a new key with "Apple Push Notifications service (APNs)" enabled
   - Download the `.p8` file
   - Upload to Firebase Console
   - Enter your Team ID (found in Apple Developer account)

   **Option B: APNs Certificates (Legacy)**
   - Create APNs certificate in Apple Developer Portal
   - Upload to Firebase Console

### 4.4 Add File to Xcode Project

1. Open Xcode:

   ```bash
   cd mobile/ios
   open Healthpuck.xcworkspace
   ```

2. In Xcode, right-click on the `Healthpuck` folder in the project navigator
3. Select **"Add Files to Healthpuck..."**
4. Select `GoogleService-Info.plist`
5. **Important:** Check "Copy items if needed" and ensure "Healthpuck" target is selected
6. Click **"Add"**

### 4.5 Verify iOS Configuration

**`mobile/ios/Healthpuck/Info.plist`** should have:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>bluetooth-central</string>
    <string>remote-notification</string>
</array>
```

### 4.6 Install Pods and Rebuild

```bash
cd mobile/ios
pod install
cd ../..
npm run ios
```

---

## Step 5: Testing

### 5.1 Test Token Registration

1. Start the mobile app
2. Log in to your account
3. Check backend logs for:

   ```
   [Notifications] Token registered successfully
   ```

4. Check database (optional):
   ```sql
   SELECT * FROM device_tokens;
   ```

### 5.2 Test Notification Delivery

1. Create an alert in the app that will trigger
2. Wait for the alert to trigger (check backend logs)
3. You should see in backend logs:

   ```
   [Notification Service] Sent X notifications, Y failed for alert Z
   ```

4. Check your device - you should receive a push notification

### 5.3 Test Notification Preferences

1. Go to Settings → Notifikationer tab
2. Toggle notification preferences
3. Trigger an alert
4. Verify notifications respect your preferences

---

## Troubleshooting

### Backend Issues

**Problem:** `FIREBASE_SERVICE_ACCOUNT_KEY not set, push notifications disabled`

**Solution:**

- Verify environment variable is set: `echo $FIREBASE_SERVICE_ACCOUNT_KEY`
- Check `.env` file if using one
- Restart backend server after setting variable

**Problem:** `Failed to initialize Firebase`

**Solution:**

- Verify JSON file is valid: `cat firebase-service-account.json | jq .`
- Check file path is correct
- Ensure service account has proper permissions

### Android Issues

**Problem:** Build fails with "google-services.json not found"

**Solution:**

- Verify file is at `mobile/android/app/google-services.json`
- Check file name is exactly `google-services.json` (case-sensitive)
- Clean and rebuild: `cd mobile/android && ./gradlew clean`

**Problem:** No notifications received on Android

**Solution:**

- Check app has notification permission (Android 13+)
- Verify `POST_NOTIFICATIONS` permission in AndroidManifest.xml
- Check device token is registered in database

### iOS Issues

**Problem:** Build fails with "GoogleService-Info.plist not found"

**Solution:**

- Verify file is in Xcode project (check project navigator)
- Ensure file is added to target
- Try removing and re-adding the file in Xcode

**Problem:** No notifications received on iOS

**Solution:**

- Verify APNs certificates are uploaded to Firebase Console
- Check bundle ID matches Firebase configuration
- Ensure app has notification permissions (Settings → Healthpuck → Notifications)
- Verify `remote-notification` is in UIBackgroundModes

**Problem:** "APNs token not set" errors

**Solution:**

- This is normal on simulator - use a real device for testing
- Ensure APNs certificates are configured in Firebase Console

### General Issues

**Problem:** Token registration fails

**Solution:**

- Check backend is running and accessible
- Verify authentication token is valid
- Check network connectivity
- Review backend logs for errors

**Problem:** Notifications sent but not received

**Solution:**

- Verify device token exists in database
- Check user notification preferences are enabled
- Ensure app is not in "Do Not Disturb" mode
- Test on a real device (not simulator/emulator)

---

## Verification Checklist

- [ ] Firebase project created
- [ ] Service account key downloaded and configured in backend
- [ ] Backend logs show "Firebase initialized successfully"
- [ ] `google-services.json` in `mobile/android/app/`
- [ ] Android app builds successfully
- [ ] `GoogleService-Info.plist` in `mobile/ios/Healthpuck/` and added to Xcode project
- [ ] APNs certificates uploaded to Firebase Console
- [ ] iOS pods installed (`pod install`)
- [ ] iOS app builds successfully
- [ ] Device token registered (check backend logs)
- [ ] Test alert triggers notification
- [ ] Notification preferences work correctly

---

## Security Notes

1. **Never commit** `firebase-service-account.json` or `google-services.json` to git
2. Add to `.gitignore`:
   ```
   firebase-service-account.json
   mobile/android/app/google-services.json
   mobile/ios/Healthpuck/GoogleService-Info.plist
   ```
3. Use environment variables for service account key in production
4. Rotate service account keys periodically
5. Limit service account permissions to minimum required

---

## Next Steps

Once setup is complete:

- Test with different alert priorities
- Test with multiple devices/users
- Configure notification sounds and badges (optional)
- Set up notification channels for Android (optional)

For more details, see the Firebase documentation:

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase](https://rnfirebase.io/messaging/usage)
