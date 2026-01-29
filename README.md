# Healthpuck

A comprehensive health monitoring application for patients and caregivers, featuring medication tracking, Whoop device integration, intelligent alerting, panic alarms, and push notifications.

**Live Site**: [https://app.healthpuck.se](https://app.healthpuck.se)

## Overview

Healthpuck is a full-stack health management platform that enables:

- **Patient Management**: Create and manage patient profiles with caregiver access
- **Organisation Management**: Caregivers manage organisations with patients (omsorgstagare), caregivers (omsorgsgivare), and organisation settings
- **Medication Tracking**: Track medications, dosages, and adherence with check-ins
- **Whoop Integration**: Connect Whoop devices to monitor recovery, sleep, workouts, and heart rate
- **Smart Alerts**: Configure alerts based on Whoop metrics or medication adherence
- **Panic Button**: Patients trigger an alarm that sends push notifications to all organisation caregivers; caregivers see a flashing row until they acknowledge
- **Push Notifications**: Firebase Cloud Messaging for alerts and panic alarms
- **Real-time Monitoring**: Live heart rate monitoring via Bluetooth or Whoop API
- **Real-time Heart Rate Sharing**: WebSocket-based real-time heart rate sharing between patients and caregivers
- **Mobile App**: React Native app for iOS and Android with native Bluetooth and push notifications

## Tech Stack

### Web Frontend

- **React 19** with TypeScript
- **React Router** for navigation
- **CSS Modules** for styling
- **React Scripts** (Create React App)

### Mobile App (iOS & Android)

- **React Native 0.73** with TypeScript
- **React Navigation** (native-stack, bottom-tabs) for navigation
- **@react-native-firebase/app** and **@react-native-firebase/messaging** for push notifications (FCM)
- **react-native-ble-manager** for Bluetooth Low Energy (heart rate from devices)
- **react-native-keychain** for secure token storage
- **react-native-svg** for vector graphics
- **@fortawesome/react-native-fontawesome**, **@fortawesome/fontawesome-svg-core**, **@fortawesome/free-solid-svg-icons** for icons (Font Awesome)
- **@react-native-async-storage/async-storage** for local storage
- **@react-native-community/netinfo** for network state
- **react-native-gesture-handler**, **react-native-screens**, **react-native-safe-area-context** for navigation and gestures
- **react-native-webview** for in-app web content

**iOS**: Xcode, CocoaPods (for Firebase, etc.). Push requires Apple Developer account and APNs. Bluetooth requires `NSBluetoothAlwaysUsageDescription` in Info.plist.

**Android**: Android Studio, Gradle. Push uses FCM; Bluetooth and background heart-rate service require permissions in AndroidManifest. Min SDK and target SDK are set in `android/build.gradle` and `android/app/build.gradle`.

### Backend

- **Express.js** with TypeScript
- **Bun** runtime and package manager
- **Drizzle ORM** with libSQL (Turso-compatible)
- **Passport.js** for OAuth (Whoop integration)
- **JWT** for authentication (httpOnly cookies and Bearer token for mobile)
- **WebSocket** (ws) for real-time communication
- **Firebase Admin SDK** (firebase-admin) for sending push notifications (FCM) to mobile devices

### Database

- **libSQL** (SQLite-compatible)
- **Turso** for managed hosting
- **Drizzle ORM** for type-safe queries

### Development Tools

- **ESLint** + **Prettier** for code quality
- **Husky** for git hooks
- **lint-staged** for pre-commit checks

## Features

### User Authentication

- User registration and login
- JWT-based authentication with httpOnly cookies
- Session management

### Patient Management

- Create patient profiles with name, email, and date of birth
- Multi-user access: patients and caregivers can access the same patient record
- Invite system: caregivers can invite other users to access a patient
- Role-based access control (patient/caregiver roles)

### Organisation Management (Caregivers)

- **Organisation tab** (mobile Settings): Visible only to caregivers. Sub-tabs:
  - **Omsorgstagare (Patients)**: List patients, add (create) and delete patients
  - **Omsorgsgivare (Caregivers)**: List organisation caregivers, add caregivers via invite (name, email, password)
  - **Organisationsinställningar**: Edit organisation name and save
- API: `GET/PATCH /api/organisations`, `GET /api/organisations/patients` (with `hasActivePanic` per patient), `GET /api/organisations/caretakers`, `POST /api/organisations/invite-users`

### Panic Button (Alarm)

- **Patient (mobile)**: Large “Alarm” button on dashboard. Tap to trigger alarm; push is sent to all organisation caregivers. If alarm is active, button becomes “Avsluta alarm” (cancel) so the patient can undo an accidental press.
- **Caregiver (mobile)**: Patient row flashes red until a caregiver expands the row and taps “Avsluta alarm” to acknowledge. Push notification opens app; dashboard refetches on focus so multiple caregivers stay in sync.
- **Backend**: `patient_panic` table; `POST /api/patients/panic`, `GET /api/patients/panic-status`, `POST /api/patients/panic/cancel`, `POST /api/patients/:id/panic/acknowledge`. FCM sends to all org caretakers on trigger.

### Push Notifications

- **Firebase Cloud Messaging (FCM)** for iOS and Android. Used for alert notifications and panic alarms.
- Backend: Register device tokens via `POST /api/notifications/register`; send via Firebase Admin SDK. Notification preferences (high/mid/low) stored per user.
- Mobile: Request permissions, register token on login, handle foreground/background and tap. See `FIREBASE_SETUP_GUIDE.md` and `mobile/FIREBASE_SETUP.md` for setup.

### Medication Management

- **Medications**: Create, update, and delete medications with:
  - Name, dosage, frequency
  - Optional notes
- **Medication Intakes**: Track daily medication intake
- **Medication Check-ins**: Record medication status:
  - `taken`: Medication was taken
  - `skipped`: Medication was intentionally skipped
  - `missed`: Medication was missed
- **Check-in History**: View medication adherence over time with filtering by date range and medication

### Whoop Integration

- **OAuth Connection**: Connect Whoop account via OAuth 2.0
- **Metrics Available**:
  - Recovery scores
  - Sleep data
  - Workout data
  - Heart rate (real-time and historical)
  - Body measurements
  - Cycle data
- **Real-time Heart Rate**:
  - Live heart rate monitoring via Whoop API
  - Rate limiting with caching to respect API limits
  - Bluetooth support for direct device connection (patients only)
  - WebSocket-based real-time sharing with caregivers
- **Automatic Token Refresh**: Handles OAuth token refresh automatically
- **Rate Limiting**: Built-in rate limiter to prevent API abuse
- **Role-based Access**: Only patients can connect Bluetooth devices; caregivers receive read-only real-time updates

### Alert System

- **Alert Types**:
  - **Whoop Metrics**: Monitor recovery scores, heart rate, sleep metrics, etc.
  - **Medication Metrics**: Track missed doses
- **Alert Configuration**:
  - Custom alert names
  - Metric path (e.g., `recovery.score.recovery_score`, `heart_rate`, `missed_dose`)
  - Operators: `<`, `>`, `=`, `<=`, `>=`
  - Threshold values
  - Priority levels: `high`, `mid`, `low`
  - Enable/disable alerts
- **Alert Scheduler**:
  - Automatically evaluates alerts at different intervals:
    - High priority: Every 30 seconds
    - Mid priority: Every 5 minutes
    - Low priority: Daily at midnight
- **Active Alerts**: View currently triggered alerts via API
- **Alert Dismissals**:
  - Dismiss active alerts directly from the dashboard
  - Dismissals are stored in the `dismissed_alerts` table with a timestamp
  - When the metric drops outside the threshold, the dismissal is automatically cleared so future triggers appear again
- **Trigger Timestamp**: Active alerts include the exact time they were triggered (rendered with Swedish locale formatting)

### Dashboard

- View patient health metrics
- Monitor active alerts
- Track medication adherence
- Display Whoop data
- **Real-time Heart Rate Display**:
  - Patients: Connect Bluetooth devices and send heart rate readings
  - Caregivers: Receive real-time heart rate updates via WebSocket (read-only)
- **Alert Cards**: Show the triggered timestamp (sv-SE format) and include dismiss buttons to hide alerts until the condition becomes active again

### Settings

- **Web**: Manage patient information, Whoop connection, alerts, medications, Bluetooth (patients only).
- **Mobile**: Tabbed Settings (Organisation, Mediciner, Varningar, Whoop, Notifikationer). Organisation tab shows sub-tabs (Omsorgstagare, Omsorgsgivare, Organisationsinställningar). Mediciner tab includes a patient dropdown for caregivers to choose which patient’s medications to manage. Icons use Font Awesome (top Settings tabs and bottom tab bar).
- **Bluetooth Connection** (patients only): Connect directly to Whoop devices; Bluetooth section hidden for caregivers.

### Mobile App Summary

- **Patients**: Dashboard with welcome, panic button (Alarm / Avsluta alarm), active alerts, heart rate, Whoop status, medications and check-ins. Whoop and Bluetooth in Settings.
- **Caregivers**: Caregiver dashboard with organisation name, list of patients (expand for heart rate and active alerts), panic flashing row and “Avsluta alarm”, link to Settings. Organisation management under Settings → Organisation.
- **Auth**: Login, Register, Onboarding (create organisation and invite patients/caregivers). Token stored in Keychain (mobile).

## Project Structure

```
healthpuck/
├── backend/              # Express API server
│   ├── src/
│   │   ├── auth/         # Passport Whoop OAuth strategy
│   │   ├── db/            # Database schema and migrations
│   │   ├── middleware/   # Auth middleware
│   │   ├── routes/       # API route handlers
│   │   │   ├── alerts.ts
│   │   │   ├── auth.ts
│   │   │   ├── checkIns.ts
│   │   │   ├── heartRate.ts
│   │   │   ├── medications.ts
│   │   │   ├── notifications.ts  # FCM token registration, preferences
│   │   │   ├── organisations.ts  # Org CRUD, patients, caretakers, invite-users
│   │   │   ├── patients.ts       # Patients, panic (trigger/status/cancel/acknowledge)
│   │   │   ├── users.ts
│   │   │   └── integrations/
│   │   │       └── whoop.ts
│   │   ├── websocket/    # WebSocket server for real-time communication
│   │   │   └── server.ts
│   │   └── utils/        # Alert evaluator, scheduler, Whoop client, notificationService, etc.
│   ├── drizzle.config.ts
│   ├── fly.toml          # Fly.io deployment config
│   └── package.json
├── mobile/               # React Native app (iOS & Android)
│   ├── src/
│   │   ├── components/   # AlertCard, HeartRateCard, HPTextInput, TabBarIcons, etc.
│   │   ├── contexts/     # AuthContext, PatientContext
│   │   ├── navigation/  # AppNavigator, types
│   │   ├── screens/      # Dashboard, CaregiverDashboard, Settings, Login, Register, Onboarding
│   │   │   └── settings/ # OrganisationSettings, MedicationsSettings, AlertsSettings, WhoopSettings, NotificationSettings
│   │   ├── services/     # api, auth, notifications, bluetooth, bluetoothMonitoring
│   │   ├── types/        # api types
│   │   └── utils/        # theme
│   ├── android/          # Android project (Gradle, FCM, permissions)
│   ├── ios/               # iOS project (Xcode, CocoaPods, FCM, Bluetooth entitlements)
│   ├── package.json
│   └── FIREBASE_SETUP.md
├── src/                  # React web frontend
│   ├── auth/             # Auth context and protected routes
│   ├── components/       # Reusable React components
│   ├── pages/            # Page components
│   │   ├── Dashboard/
│   │   ├── Login/
│   │   ├── Register/
│   │   └── Settings/
│   └── utils/            # Frontend utilities
│       ├── whoopBluetooth.ts  # Bluetooth device connection
│       └── heartRateWebSocket.ts  # WebSocket client for real-time updates
├── scripts/              # Development scripts
│   ├── start-servers.ts  # Start all services concurrently
│   ├── with-node-localstorage.js
│   └── setup-webstorage-shim.js
├── package.json
├── FIREBASE_SETUP_GUIDE.md  # Backend + mobile FCM setup
└── README.md
```

## Getting Started

### Prerequisites

- **Bun** (v1.x) - [Install Bun](https://bun.sh)
- **Turso CLI** (for local database) - [Install Turso](https://docs.turso.tech/cli/installation)
- **Node.js** (for frontend scripts) - Optional, Bun can run Node scripts

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd healthpack
```

2. Install dependencies:

```bash
bun install
cd backend && bun install
```

3. Set up environment variables:

**Backend** (`backend/.env`):

```bash
cp backend/.env.example backend/.env
```

Required variables:

- `APP_ENV=development`
- `DATABASE_URL=http://127.0.0.1:8080` (or your Turso URL)
- `TURSO_AUTH_TOKEN` (only if using Turso-hosted database)
- `CORS_ORIGIN=http://localhost:3000` (development)
- `JWT_SECRET=$(openssl rand -base64 32)`
- `JWT_EXPIRES_IN=7d`
- `WHOOP_CLIENT_ID` (from Whoop developer portal)
- `WHOOP_CLIENT_SECRET` (from Whoop developer portal)
- `WHOOP_REDIRECT_URI=http://localhost:3001/api/integrations/whoop/callback`

### Running Locally

#### Option 1: Start all services with one command

```bash
bun run scripts/start-servers.ts
```

This will start:

- Turso dev server (local libSQL)
- Backend API (port 3001)
- Frontend dev server (port 3000)

#### Option 2: Start services individually

1. Start local database:

```bash
turso dev
# Note the URL (e.g., http://127.0.0.1:8080)
```

2. Run database migrations:

```bash
cd backend
bun run db:migrate
```

3. Start backend:

```bash
cd backend
bun run dev
# → http://localhost:3001
```

4. Start frontend (in a new terminal):

```bash
npm start
# or
bun run start
# → http://localhost:3000
```

### Database Migrations

Generate a new migration:

```bash
cd backend
bun run db:generate
```

Run migrations:

```bash
cd backend
bun run db:migrate
```

Open Drizzle Studio (database GUI):

```bash
cd backend
bun run db:studio
```

## Development

### Code Quality

Lint the entire project:

```bash
npm run lint
# or
bun run lint
```

Auto-fix linting issues:

```bash
npm run lint -- --fix
```

Format code:

```bash
npm run format
# or
bun run format
```

### Testing

Run frontend tests:

```bash
npm test
```

### Git Hooks

The project uses Husky for git hooks. Pre-commit hooks will:

- Run ESLint on staged files
- Format code with Prettier

## API Endpoints

### Authentication

- `POST /api/users` - Register new user
- `POST /api/auth/login` - Login (sets httpOnly cookie)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Patients

- `POST /api/patients` - Create patient
- `GET /api/patients` - List user's patients
- `GET /api/patients/:id` - Get patient details
- `GET /api/patients/:id/users` - Get users with access to patient
- `POST /api/patients/:id/invite` - Invite user to patient
- `PUT /api/patients/:id/users/:userId` - Update user role
- `DELETE /api/patients/:id/users/:userId` - Remove user access
- `DELETE /api/patients/:id` - Delete patient
- `POST /api/patients/panic` - Trigger panic alarm (patient only; sends FCM to org caregivers)
- `GET /api/patients/panic-status` - Get current panic status for patient (patient only)
- `POST /api/patients/panic/cancel` - Cancel active panic (patient only)
- `POST /api/patients/:id/panic/acknowledge` - Acknowledge patient's panic (caregiver only)

### Organisations

- `GET /api/organisations` - Get current user's organisation
- `PATCH /api/organisations` - Update organisation (e.g. name); body: `{ name: string }`
- `GET /api/organisations/patients` - List organisation patients (includes `hasActivePanic` per patient)
- `GET /api/organisations/caretakers` - List organisation caregivers
- `POST /api/organisations/invite-users` - Invite users (caregivers/patients) to organisation; body: `{ name, email, password, role }`

### Notifications

- `POST /api/notifications/register` - Register FCM device token; body: `{ token: string }`
- `GET /api/notifications/preferences` - Get notification preferences
- `PATCH /api/notifications/preferences` - Update preferences (e.g. priority levels)

### Medications

- `POST /api/medications` - Create medication
- `GET /api/medications/patient/:patientId` - Get patient's medications
- `GET /api/medications/:id` - Get medication details
- `PUT /api/medications/:id` - Update medication
- `DELETE /api/medications/:id` - Delete medication
- `POST /api/medications/:id/intake` - Record medication intake
- `GET /api/medications/:id/intake/:date` - Get intake status for date

### Medication Check-ins

- `GET /api/check-ins` - Get check-ins (supports `?medicationId=`, `?patientId=`, `?range=`, `?limit=`)
- `POST /api/check-ins` - Create check-in

### Whoop Integration

- `GET /api/integrations/whoop/connect` - Start OAuth flow
- `GET /api/integrations/whoop/callback` - OAuth callback
- `GET /api/integrations/whoop/status` - Get connection status
- `GET /api/integrations/whoop/metrics` - Get Whoop metrics (supports `?range=`)
- `GET /api/integrations/whoop/heart-rate` - Get real-time heart rate
- `POST /api/integrations/whoop/heart-rate/stop` - Stop heart rate polling
- `POST /api/integrations/whoop/test` - Test connection
- `DELETE /api/integrations/whoop/disconnect` - Disconnect Whoop

### Heart Rate

- `POST /api/heart-rate` - Send heart rate reading (patients only)
  - Body: `{ heartRate: number, source: "bluetooth" | "api" }`
  - Stores reading in database and broadcasts to caregivers via WebSocket

### Alerts

- `POST /api/alerts` - Create alert
- `GET /api/alerts` - List alerts for current patient
- `GET /api/alerts/:id` - Get alert details
- `PUT /api/alerts/:id` - Update alert
- `DELETE /api/alerts/:id` - Delete alert
- `GET /api/alerts/active` - Get currently active alerts
- `POST /api/alerts/:id/dismiss` - Dismiss an active alert (automatically resets when the condition is no longer met)

### Health

- `GET /health` - Health check
- `GET /health/cors` - Check CORS configuration (shows allowed origins)

### WebSocket

- `WS /` - WebSocket connection for real-time heart rate updates
  - Authentication via JWT cookie
  - Patients can send: `{ type: "heart-rate-update", heartRate: number }`
  - Caregivers receive: `{ type: "heart-rate", heartRate: number, timestamp: number }`
  - Caregivers subscribe: `{ type: "subscribe", patientId: number }`

## Deployment

### Backend (Fly.io)

1. Install Fly CLI and authenticate:

```bash
fly auth login
```

2. Deploy:

```bash
cd backend
fly deploy --config fly.toml
```

3. Set secrets:

```bash
cd backend
fly secrets set \
  APP_ENV=production \
  DATABASE_URL=libsql://<your-db>.turso.io \
  TURSO_AUTH_TOKEN=<token> \
  JWT_SECRET=<random> \
  JWT_EXPIRES_IN=7d \
  CORS_ORIGIN=https://app.healthpuck.se \
  WHOOP_CLIENT_ID=<id> \
  WHOOP_CLIENT_SECRET=<secret> \
  WHOOP_REDIRECT_URI=https://backend-hidden-butterfly-2266.fly.dev/api/integrations/whoop/callback
```

**Note**: For multiple frontend origins, separate them with commas in `CORS_ORIGIN`:

```bash
CORS_ORIGIN=https://app.healthpuck.se,https://example.com
```

### Frontend (GitHub Pages)

The frontend is deployed to GitHub Pages and served at `https://app.healthpuck.se`.

#### Deployment

The frontend is automatically deployed via GitHub Actions when changes are pushed to `main`:

```bash
npm run build
npm run deploy
```

Or simply push to `main` - the `.github/workflows/frontend-gh-pages.yml` workflow will handle the deployment.

#### Custom Domain Setup

1. **DNS Configuration**: Point your domain's DNS to GitHub Pages by adding 4 A records:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`

2. **GitHub Pages Settings**:
   - Go to repository Settings → Pages
   - Add your custom domain (e.g., `app.healthpuck.se`)
   - Enable "Enforce HTTPS"

3. **CNAME File**: The deployment workflow automatically creates/updates `docs/CNAME` with your custom domain.

4. **Backend CORS**: Make sure the backend `CORS_ORIGIN` secret includes your frontend domain.

For detailed DNS setup instructions, see `docs/DOMAIN_SETUP.md`.

### Database (Turso)

1. Create a database:

```bash
turso db create <database-name>
```

2. Create an auth token:

```bash
turso db tokens create <database-name>
```

3. Get the database URL:

```bash
turso db show <database-name> --url
```

4. Run migrations:

```bash
cd backend
DATABASE_URL=libsql://<db>.turso.io TURSO_AUTH_TOKEN=<token> bun run db:migrate
```

## Whoop OAuth Setup

1. Register an application at [Whoop Developer Portal](https://developer.whoop.com)
2. Configure redirect URI:
   - Development: `http://localhost:3001/api/integrations/whoop/callback`
   - Production: `https://backend-hidden-butterfly-2266.fly.dev/api/integrations/whoop/callback`
3. Request scopes: `offline`, `read:profile`, `read:recovery`, `read:cycles`, `read:sleep`, `read:workout`, `read:body_measurement`
4. Add credentials to environment variables

## Alert System Details

### Metric Paths

**Whoop Metrics:**

- `recovery.score.recovery_score` - Recovery score
- `heart_rate` or `heartrate` - Heart rate
- `sleep.*` - Any sleep metric path
- Custom paths supported (e.g., `cycles[0].recovery.score.recovery_score`)

**Medication Metrics:**

- `missed_dose` - Count of missed doses in last 24 hours

### Alert Evaluation

Alerts are evaluated automatically by the scheduler:

- High priority alerts: Checked every 30 seconds
- Mid priority alerts: Checked every 5 minutes
- Low priority alerts: Checked daily at midnight

Alerts trigger when the current metric value matches the operator and threshold condition.

## Real-time Heart Rate Sharing

### Architecture

The application supports real-time heart rate sharing between patients and caregivers using WebSockets:

1. **Patients** can connect Whoop devices via Bluetooth and send heart rate readings to the backend
2. **Backend** stores readings in the `heart_rate_readings` database table
3. **Backend** broadcasts readings to all connected caregivers via WebSocket
4. **Caregivers** receive real-time updates and see the patient's current heart rate

### Database Schema

The `heart_rate_readings` table stores:

- `patient_id` - Foreign key to patients
- `heart_rate` - Heart rate value (bpm)
- `source` - Either "bluetooth" or "api"
- `timestamp` - When the reading was recorded

### Role-based Access

- **Patients**: Can connect Bluetooth devices and send heart rate readings
- **Caregivers**: Receive read-only real-time heart rate updates via WebSocket
- Bluetooth connection UI is automatically hidden for caregivers in Settings

### WebSocket Protocol

**Connection**: WebSocket connection is authenticated using JWT from httpOnly cookies.

**Patient Messages**:

```json
{ "type": "heart-rate-update", "heartRate": 72 }
```

**Caregiver Messages**:

```json
{ "type": "subscribe", "patientId": 1 }
```

**Server Broadcasts**:

```json
{ "type": "heart-rate", "heartRate": 72, "timestamp": 1234567890 }
```

## Alert Dismissals

- Active alerts can be dismissed from the dashboard; the dismissal is persisted so the same alert stays hidden while the metric remains in the alerting range
- Dismissals are stored in the `dismissed_alerts` table with `alert_id`, `patient_id`, and `dismissed_at`
- When the monitored metric returns to a safe range, the dismissal entry is cleared automatically so the alert can notify again the next time it crosses the threshold

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure linting passes: `npm run lint`
4. Format code: `npm run format`
5. Submit a pull request

## License

Private project - All rights reserved
