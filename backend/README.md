# Healthpack Backend

Express.js API using Drizzle ORM with libSQL (Turso-compatible). Bun for runtime and tooling.

## Quick start (local dev)

1. Start a local libSQL server

```bash
turso dev
# Note the URL it prints, e.g. http://127.0.0.1:8080
```

2. Copy the example env file and fill in values:

```bash
cp backend/.env.example backend/.env
```

At minimum update:

- `APP_ENV=development`
- `DATABASE_URL=http://127.0.0.1:8080`
- `CORS_ORIGIN=http://localhost:3000`
- `JWT_SECRET=$(openssl rand -base64 32)`
- `WHOOP_CLIENT_ID` / `WHOOP_CLIENT_SECRET` from the Whoop developer portal
- `WHOOP_REDIRECT_URI=http://localhost:3001/api/integrations/whoop/callback` (must also be registered with Whoop)

3. Install deps (repo root already uses Bun)

```bash
bun install
cd backend && bun install
```

4. Run migrations and start the API

```bash
cd backend
bun run db:migrate
bun run dev
# → http://localhost:3001
```

Frontend should use `credentials: "include"` for auth calls.

## Environment variables

Required (dev & prod):

- `APP_ENV` = development | production
- `DATABASE_URL` = libsql URL (local dev: http://127.0.0.1:8080; Turso: libsql://<db>.turso.io)
- `TURSO_AUTH_TOKEN` = only required when using Turso-hosted libSQL
- `CORS_ORIGIN` = exact frontend origin (e.g., http://localhost:3000 or your GitHub Pages domain)
- `JWT_SECRET` = random string used to sign session cookies
- `JWT_EXPIRES_IN` = e.g., 7d
- `WHOOP_CLIENT_ID` = OAuth client id issued by Whoop
- `WHOOP_CLIENT_SECRET` = OAuth client secret issued by Whoop
- `WHOOP_REDIRECT_URI` = must match the callback registered with Whoop (`http://localhost:3001/api/integrations/whoop/callback` for local dev)
- `WHOOP_OAUTH_BASE_URL` = defaults to `https://api.prod.whoop.com/oauth/oauth2`
- `WHOOP_API_BASE_URL` = defaults to `https://api.prod.whoop.com/developer/v2`
- `WHOOP_CONNECT_REDIRECT_SUCCESS` (optional) = where to send the browser after a successful connection (defaults to `<frontend>/settings?tab=whoop` – adjust if your SPA uses hash routing, e.g. `<frontend>/#/settings?tab=whoop`)
- `WHOOP_CONNECT_REDIRECT_ERROR` (optional) = where to send the browser if connecting fails (defaults to `<frontend>/settings?tab=whoop`)

### Whoop OAuth configuration

- Register a developer application at [https://developer.whoop.com](https://developer.whoop.com) to obtain `WHOOP_CLIENT_ID` and `WHOOP_CLIENT_SECRET`.
- Add the redirect URI you plan to use. For local development it should be `http://localhost:3001/api/integrations/whoop/callback`. For Fly.io replace the host with your Fly app domain, e.g. `https://healthpack-api.fly.dev/api/integrations/whoop/callback`.
- The provided defaults for `WHOOP_OAUTH_BASE_URL` and `WHOOP_API_BASE_URL` point to Whoop production endpoints. If Whoop provides a sandbox environment, override these values accordingly.
- Grant the following scopes when you register your app so we can build the dashboards: `offline`, `read:profile`, `read:recovery`, `read:cycles`, `read:sleep`, `read:workout`, `read:body_measurement`.
- A single Whoop connection is stored per patient. Any caregiver connected to the patient can complete the OAuth flow; once connected, the shared credentials are visible to the patient and every caregiver.

## Whoop integration (manual testing)

All Whoop integration endpoints require an authenticated user (cookie `hp_token`). The quickest way to test is to log in with `curl` or via the frontend, then reuse the cookie.

```bash
# 1. Log in and store cookies
curl -i -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"<your user email>","password":"<password>"}' \
  http://localhost:3001/api/auth/login

# 2. Start the Whoop authorization flow by visiting this URL in your browser
#    (you need to approve the request in the Whoop UI):
#    http://localhost:3001/api/integrations/whoop/connect

# 3. Inspect current status
curl -b cookies.txt http://localhost:3001/api/integrations/whoop/status

# 4. Run the connection test (fetches the Whoop profile and refreshes tokens if needed)
curl -b cookies.txt -X POST http://localhost:3001/api/integrations/whoop/test
```

The `/test` endpoint is useful while developing—if it succeeds you know stored credentials work and the API is reachable. Future background sync jobs can reuse the helper in `src/utils/whoopSync.ts`.

Notes:

- In production, cookies are set with `SameSite=None; Secure=true`.
- In development, cookies use `SameSite=Lax; Secure=false`.

## Scripts (backend)

- `bun run dev` – start dev server (hot reload)
- `bun run build` – compile TS → dist
- `bun start` – run compiled server (`node dist/index.js`)
- `bun run db:migrate` – run migrations (auto-loads `backend/.env`)
- `bun run db:generate` – generate migrations (via drizzle-kit)

## Deploying

### Turso (managed libSQL)

1. Create a DB and a token. Save:
   - `DATABASE_URL=libsql://<your-db>.turso.io`
   - `TURSO_AUTH_TOKEN=<token>`
2. Run migrations from CI or locally:

```bash
DATABASE_URL=... TURSO_AUTH_TOKEN=... bun run db:migrate
```

### Fly.io (API)

1. Install the Fly CLI locally and run `fly launch` (already generated `fly.toml` under `backend/`).
2. Set required runtime secrets (one-time or through CI):

   ```bash
   cd backend
   fly secrets set \
     APP_ENV=production \
     DATABASE_URL=libsql://<your-db>.turso.io \
     TURSO_AUTH_TOKEN=<token> \
     JWT_SECRET=<random> \
     JWT_EXPIRES_IN=7d \
     CORS_ORIGIN=https://<frontend-domain>
   ```

3. Deploy with `fly deploy --config fly.toml` from `backend/` or rely on the GitHub workflow.
4. Verify health check at `/health` once deployment finishes.

### CI (GitHub Actions)

- `.github/workflows/backend-fly.yml` runs migrations and deploys to Fly.io.
- Repo secrets required:
  - `FLY_API_TOKEN`
  - `APP_ENV`, `DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`

## API Endpoints (summary)

- `GET /health` – health check
- `POST /api/users` – register user `{ email, name, password }`
- `POST /api/auth/login` – sets httpOnly cookie `hp_token`
- `GET /api/auth/me` – returns current user if authenticated
- `POST /api/auth/logout` – clears cookie
