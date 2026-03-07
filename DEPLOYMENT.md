# Hosting EEWA

This app has a **Node/Express API** (backend) and a **Vite/React** frontend. You can host them together or separately.

---

## Overview

| Part      | Tech           | Build / Run |
|-----------|----------------|-------------|
| Backend   | Node, Express, Prisma | `npm run build` → `npm start` |
| Frontend  | Vite, React    | `npm run build` → static files in `frontend/dist` |
| Database  | PostgreSQL (e.g. [Neon](https://neon.tech)) | Already in use via `DATABASE_URL` |

In **production** the frontend must call the real API URL (no Vite proxy). Set **`VITE_API_URL`** when building the frontend and **`CORS_ORIGIN`** on the backend to your frontend URL.

---

## Option 1: All-in-one (backend + frontend on one host)

Good for: **Railway**, **Render**, **Fly.io**, or a **VPS** (Ubuntu + Node).

### 1. Backend as main process, serve frontend from Express

- Build the frontend and serve its static files from the API.

**Backend (root):**

1. Set env vars (see “Environment variables” below).
2. Build and run API:
   ```bash
   npm install
   npx prisma generate
   npm run build
   npm start
   ```
3. API runs on `PORT` (e.g. 3001).

**Frontend:**

1. Set the API URL and build:
   ```bash
   cd frontend
   npm install
   # Use your real API URL, e.g. https://api.yourdomain.com
   VITE_API_URL=https://api.yourdomain.com npm run build
   ```
2. Copy `frontend/dist` into the backend (e.g. `backend/public`) and serve it with Express (see “Serving frontend from Express” below).

**Environment (backend):**

- `PORT` – e.g. `3001` (or what the host sets).
- `DATABASE_URL` – production Postgres (e.g. Neon).
- `JWT_SECRET` – long random string (≥32 chars).
- `ENCRYPTION_KEY` – 64 hex chars.
- `CORS_ORIGIN` – same as your site, e.g. `https://yourdomain.com` (or the host’s URL).

---

## Option 2: Split (frontend and backend on different hosts)

Good for: **Vercel/Netlify** (frontend) + **Railway/Render** (backend).

### Backend (e.g. Railway / Render)

1. Connect the repo; root = backend (where `package.json` and `prisma/` live).
2. **Build:** `npm install && npx prisma generate && npm run build`
3. **Start:** `npm start`
4. Set env vars (see below). Set **`CORS_ORIGIN`** to your frontend URL (e.g. `https://eewa.vercel.app`).
5. Note the backend URL (e.g. `https://eewa-api.up.railway.app`).

### Frontend (e.g. Vercel / Netlify)

1. Set **root** to the **`frontend`** folder (or configure build to run inside `frontend`).
2. **Build:** `npm install && npm run build`
3. **Build env:** set **`VITE_API_URL`** to the backend URL (e.g. `https://eewa-api.up.railway.app`). No trailing slash.
4. **Publish:** the built files in `frontend/dist` (Vercel/Netlify usually detect this).

---

## Environment variables

### Backend (API)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No (default 3001) | Port the API listens on. |
| `NODE_ENV` | No | `production` in prod. |
| `DATABASE_URL` | Yes | PostgreSQL URL (e.g. Neon). |
| `JWT_SECRET` | Yes | ≥32 characters, random. |
| `JWT_EXPIRES_IN` | No | e.g. `15m`. |
| `JWT_REFRESH_EXPIRES_IN` | No | e.g. `7d`. |
| `ENCRYPTION_KEY` | Yes | 64 hex characters. |
| `CORS_ORIGIN` | Yes in prod | Frontend origin, e.g. `https://yourdomain.com`. |

Generate secrets:

```bash
# JWT_SECRET (32+ chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ENCRYPTION_KEY (64 hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex') + require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend (build-time)

| Variable | When | Description |
|----------|------|-------------|
| `VITE_API_URL` | Production build | Full API URL, e.g. `https://api.yourdomain.com`. Leave empty only if you rely on same-origin (e.g. same host serving API + SPA). |

Set when building, e.g.:

- **Unix:** `VITE_API_URL=https://api.yourdomain.com npm run build`
- **Windows (PowerShell):** `$env:VITE_API_URL="https://api.yourdomain.com"; npm run build`

---

## Serving frontend from Express (Option 1)

If you host backend and frontend on the same server and want the API to serve the SPA:

1. Build the frontend with the **same origin** as the API (e.g. `VITE_API_URL` empty or `https://yourdomain.com` so API calls are same-origin).
2. Copy `frontend/dist` into the backend, e.g. as `public/`:

   ```bash
   # From repo root
   cp -r frontend/dist public
   ```

3. In `src/app.ts` (before `app.use(errorHandler(...))`), add:

   ```ts
   import path from 'path';

   // Serve frontend static files (after API routes)
   app.use(express.static(path.join(__dirname, '../public')));

   // SPA fallback: serve index.html for non-API routes
   app.get('*', (req, res, next) => {
     if (req.path.startsWith('/api')) return next();
     res.sendFile(path.join(__dirname, '../public/index.html'));
   });
   ```

   (After `npm run build`, `__dirname` in `dist/app.js` is the `dist` folder, so `../public` is the repo’s `public` folder.)

4. Set `CORS_ORIGIN` to your public URL (e.g. `https://yourdomain.com`).

---

## Database (production)

- **Neon** (or any Postgres): use the production connection string in `DATABASE_URL`.
- After deploy, run migrations (or push schema) once:
  ```bash
  npx prisma db push
  # or
  npx prisma migrate deploy
  ```
- Seed admin if needed:
  ```bash
  npx prisma db seed
  ```

---

## Quick reference by platform

| Platform | Backend | Frontend | Notes |
|----------|---------|----------|--------|
| **Railway** | Add service, root = repo root, build `npm run build`, start `npm start`, set env + `CORS_ORIGIN`. | Add second service, root = `frontend`, build with `VITE_API_URL` = backend URL. | Two services or one + static. |
| **Render** | Web Service, root = repo, build as above, start `npm start`, set env. | Static Site, root = `frontend`, build command + `VITE_API_URL`. | Same idea. |
| **Vercel** | Use serverless or host API elsewhere. | Root = `frontend`, set `VITE_API_URL` in project env. | Frontend fits Vercel well. |
| **VPS** | Install Node, clone repo, `npm run build`, `npm start` (or use PM2). Optionally serve frontend from same process (see above). | Build in `frontend` with `VITE_API_URL`; copy `dist` to backend `public/` or serve with nginx. | Full control. |

---

## Checklist before go-live

- [ ] `NODE_ENV=production` (or equivalent) on the API.
- [ ] Strong `JWT_SECRET` and `ENCRYPTION_KEY` (not dev values).
- [ ] `CORS_ORIGIN` set to the exact frontend URL (scheme + host, no trailing slash).
- [ ] Frontend built with correct `VITE_API_URL` (your API URL).
- [ ] `DATABASE_URL` points to production Postgres; migrations/push and seed (if needed) run once.
- [ ] Admin user exists (seed or create) and you can log in.
