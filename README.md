# Healthpack

A comprehensive health monitoring application for patients and caregivers, featuring medication tracking, Whoop device integration, and intelligent alerting.

## Overview

Healthpack is a full-stack health management platform that enables:

- **Patient Management**: Create and manage patient profiles with caregiver access
- **Medication Tracking**: Track medications, dosages, and adherence with check-ins
- **Whoop Integration**: Connect Whoop devices to monitor recovery, sleep, workouts, and heart rate
- **Smart Alerts**: Configure alerts based on Whoop metrics or medication adherence
- **Real-time Monitoring**: Live heart rate monitoring via Bluetooth or Whoop API

## Tech Stack

### Frontend

- **React 19** with TypeScript
- **React Router** for navigation
- **CSS Modules** for styling
- **React Scripts** (Create React App)

### Backend

- **Express.js** with TypeScript
- **Bun** runtime and package manager
- **Drizzle ORM** with libSQL (Turso-compatible)
- **Passport.js** for OAuth (Whoop integration)
- **JWT** for authentication (httpOnly cookies)

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
  - Bluetooth support (frontend utility available)
- **Automatic Token Refresh**: Handles OAuth token refresh automatically
- **Rate Limiting**: Built-in rate limiter to prevent API abuse

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

### Dashboard

- View patient health metrics
- Monitor active alerts
- Track medication adherence
- Display Whoop data

### Settings

- Manage patient information
- Configure Whoop connection
- Set up and manage alerts
- Manage medications

## Project Structure

```
healthpack/
├── backend/              # Express API server
│   ├── src/
│   │   ├── auth/         # Passport Whoop OAuth strategy
│   │   ├── db/           # Database schema and migrations
│   │   ├── middleware/   # Auth middleware
│   │   ├── routes/       # API route handlers
│   │   │   ├── alerts.ts
│   │   │   ├── auth.ts
│   │   │   ├── checkIns.ts
│   │   │   ├── medications.ts
│   │   │   ├── patients.ts
│   │   │   ├── users.ts
│   │   │   └── integrations/
│   │   │       └── whoop.ts
│   │   └── utils/        # Alert evaluator, scheduler, Whoop client, etc.
│   ├── drizzle.config.ts
│   ├── fly.toml          # Fly.io deployment config
│   └── package.json
├── src/                  # React frontend
│   ├── auth/             # Auth context and protected routes
│   ├── components/       # Reusable React components
│   ├── pages/            # Page components
│   │   ├── Dashboard/
│   │   ├── Login/
│   │   ├── Register/
│   │   └── Settings/
│   └── utils/            # Frontend utilities (Whoop Bluetooth, etc.)
├── scripts/              # Development scripts
│   ├── start-servers.ts  # Start all services concurrently
│   ├── with-node-localstorage.js
│   └── setup-webstorage-shim.js
├── package.json
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
- `CORS_ORIGIN=http://localhost:3000`
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

### Alerts

- `POST /api/alerts` - Create alert
- `GET /api/alerts` - List alerts for current patient
- `GET /api/alerts/:id` - Get alert details
- `PUT /api/alerts/:id` - Update alert
- `DELETE /api/alerts/:id` - Delete alert
- `GET /api/alerts/active` - Get currently active alerts

### Health

- `GET /health` - Health check

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
  CORS_ORIGIN=https://<frontend-domain> \
  WHOOP_CLIENT_ID=<id> \
  WHOOP_CLIENT_SECRET=<secret> \
  WHOOP_REDIRECT_URI=https://<api-domain>/api/integrations/whoop/callback
```

### Frontend (GitHub Pages)

The frontend is configured for GitHub Pages deployment:

```bash
npm run build
npm run deploy
```

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
   - Production: `https://<your-api-domain>/api/integrations/whoop/callback`
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

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure linting passes: `npm run lint`
4. Format code: `npm run format`
5. Submit a pull request

## License

Private project - All rights reserved
