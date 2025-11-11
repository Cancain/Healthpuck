# Healthpack Backend

Express.js API using Drizzle ORM with libSQL (Turso-compatible). Bun for runtime and tooling.

## Quick start (local dev)

1. Start a local libSQL server

```bash
turso dev
# Note the URL it prints, e.g. http://127.0.0.1:8080
```

2. Create `backend/.env`

```env
APP_ENV=development
DATABASE_URL=http://127.0.0.1:8080
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=<run `openssl rand -base64 32` and paste>
JWT_EXPIRES_IN=7d
```

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
- `CORS_ORIGIN` = exact frontend origin (e.g., http://localhost:3000 or your GitHub Pages domain)
- `JWT_SECRET` = random string used to sign session cookies
- `JWT_EXPIRES_IN` = e.g., 7d

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
