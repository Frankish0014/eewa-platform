# Deploying EEWA

## Host the whole platform online

EEWA is one **API + SPA** process: the Docker image serves the Vite build from `/app/public` and `/api/*` on the **same origin**. You only need a public URL and a Postgres database (e.g. **Neon**, which you can keep).

### 1. Put code on GitHub (or GitLab)

Render, Railway, Fly, and most hosts deploy from a repo. Do **not** commit `.env`; use the host’s **Environment** / **Variables** UI for secrets.

### 2. Set production environment variables

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Your **Neon** URL with `?sslmode=require` (or `sslmode=require` in the query string). |
| `JWT_SECRET` | Random string, ≥32 characters. |
| `ENCRYPTION_KEY` | Exactly **64** hex characters (32 bytes). Same command as in Docker Compose section below. |
| `CORS_ORIGIN` | **Exact** browser origin users type — e.g. `https://your-service.onrender.com` — no trailing slash. If this mismatches the site URL, the browser will block API calls. |
| `SMTP_*` | Optional; same as local Gmail/app-password setup. |
| `PORT` | Leave unset on **Render** / **Railway** / **Fly** — they inject `PORT`; the app reads it automatically. |
| `STATIC_FILES_DIR` | Use **`/app/public`** when running the provided **Dockerfile** (already the default in the image). |

The container entrypoint runs **`prisma migrate deploy`** before starting the server. Use a **new** Neon DB for clean migrations, or see [baselining](#existing-database-was-using-db-push) if you already applied schema with `db push`.

### 3. Deploy the Docker image

**Render**

1. New **Web Service** → connect the repo.
2. **Environment** → **Docker**; root `Dockerfile` is auto-detected.
3. Add the env vars above (mark secrets in the dashboard).
4. Deploy. When the service is live, set **`CORS_ORIGIN`** to the **https URL** Render shows and redeploy if you had to fix it.

Optional: in the repo root, `render.yaml` can create the web service skeleton; you still assign secrets in the dashboard.

**Railway / Fly.io**

- Create a project, deploy from the same repo with **Dockerfile** build.
- Set the same variables; these platforms also set **`PORT`** for you.

**Your own VPS (Ubuntu, etc.)**

1. Install Docker.
2. Build: `docker build -t eewa .`
3. Run (example — replace secrets and Neon URL):

   ```bash
   docker run -d --restart unless-stopped -p 3001:3001 \
     -e NODE_ENV=production \
     -e DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require" \
     -e JWT_SECRET="your-32-plus-char-secret" \
     -e ENCRYPTION_KEY="your-64-hex-char-key" \
     -e CORS_ORIGIN="https://your-domain.com" \
     -e STATIC_FILES_DIR=/app/public \
     eewa
   ```

4. Put **Caddy** or **nginx** in front for HTTPS on 443 and proxy to `127.0.0.1:3001`. Set **`CORS_ORIGIN`** to the public `https://` URL.

### 4. Smoke-check

- Open `https://your-url/` — SPA loads.
- `https://your-url/api/health` returns OK.
- Sign-in / main flows work.

---

## Docker Compose (API + Postgres + SPA)

1. Copy `.env.example` to `.env` and set **JWT_SECRET** (≥32 characters) and **ENCRYPTION_KEY** (64 hex characters). Generate the key:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Set **CORS_ORIGIN** to the URL users open in the browser (for Compose on your machine, `http://localhost:3001` if you use default **HOST_PORT**).

3. From the repo root:

   ```bash
   docker compose up --build
   ```

4. Open `http://localhost:3001` (or your **HOST_PORT**). The API serves the Vite build and `/api/*` on the same origin; the frontend is built with `VITE_API_URL` empty so requests stay relative.

Migrations run on container start (`prisma migrate deploy`). For a **new** database, the bundled initial migration applies cleanly.

### Existing database (was using `db push`)

If tables already exist, `migrate deploy` can fail because the init migration tries to create them again. Options:

- **Fresh volume**: remove the Postgres volume and start clean (data loss), or use a new database name.
- **Baseline**: follow [Prisma baselining](https://www.prisma.io/docs/guides/migrate/developing-with-db-push) — mark the current migration as already applied with `prisma migrate resolve` against a copy of production schema, or squash migrations after aligning history.

## Production notes

- Put a reverse proxy (Caddy, nginx, Traefik) in front for TLS; set **CORS_ORIGIN** to the public `https://` origin.
- Optional email: set **SMTP_** variables in `.env` for transactional mail.
- API health check: `GET /api/health`.

## Build without Docker

```bash
npm ci && npm run db:migrate && npm run build && npm start
```

In `frontend`, run `VITE_API_URL= npm run build` and set **STATIC_FILES_DIR** to the absolute path of `frontend/dist` so the API serves the SPA.
