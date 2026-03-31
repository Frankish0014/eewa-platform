# EEWA — Entrepreneur Empowerment Web Application

Live demo: `https://youtu.be/eXHdib8EtVk`

Platform for African student entrepreneurs: projects, milestones, mentor matching, opportunities, and secure messaging.

**deployed app:** `https://eewa-platform.onrender.com` Note: the Link Loads for like 50 secs on render before it the actual page renders.

**Google Doc** : `https://docs.google.com/document/d/1WDzGRM7Z3a1HwpOlcehUJAgxA0A7l5l9HHKoFAGEuUI/edit?usp=sharing`

**Production deployment:** **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** — Docker, Render, Neon Postgres, `DATABASE_URL`, `CORS_ORIGIN`, optional SMTP (Gmail) future functionality to implement in production but already initiated in the Development.

---

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+ (local install or Docker — see DEPLOYMENT for Docker Compose)
- **Git**

---

## Full local setup (follow in order)

Use these steps on a clean machine so the API and frontend both work end to end.

### Step 1 — Clone the repository

```bash
git clone <YOUR_PUBLIC_GITHUB_REPO_URL>
cd eewa-platform
```

### Step 2 — Create a PostgreSQL database

Create an empty database (and user if needed). Your `DATABASE_URL` will look like:

`postgresql://USER:PASSWORD@localhost:5432/eewa`

### Step 3 — Backend environment (`.env`)

1. From the **repository root**, copy the example file:

   ```bash
   cp .env.example .env
   ```

   Windows PowerShell: `Copy-Item .env.example .env`

2. Edit `.env` and set at minimum:

   - **`DATABASE_URL`** — connection string from Step 2.
   - **`JWT_SECRET`** — random string, **at least 32 characters**.
   - **`ENCRYPTION_KEY`** — exactly **64 hex characters**. Generate with:

     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```

   - **`CORS_ORIGIN`** — for local dev use `http://localhost:5173` (exact URL, no trailing slash).

3. Optionally set **`NODE_ENV=development`** for local runs.

4. **Email:** `SMTP_*` is optional for local dev; without it, some flows log email instead of sending. See `.env.example` and DEPLOYMENT.md.

### Step 4 — Install backend dependencies and apply schema

From the **repository root**:

```bash
npm install
npx prisma generate
```

Then apply existing migrations (recommended for a fresh clone — no prompts):

```bash
npx prisma migrate deploy
```

For active development you may use `npx prisma migrate dev` instead. For a quick schema sync **without** using migration files (dev only):

```bash
npx prisma db push
```

### Step 5 — Seed admin and baseline data

```bash
npm run db:seed
```

Default admin: **`admin@eewa.dev`** / **`AdminPassword1!`**.

### Step 6 — Frontend install and API URL

```bash
cd frontend
npm install
```

Create **`frontend/.env.development`**:

```env
VITE_API_URL=http://localhost:3001
```

(Match the root `PORT`, default **3001**.)

### Step 7 — Run API and SPA

From the **repository root**:

```bash
cd ..
npm run dev:all
```

| Service   | URL |
|-----------|-----|
| Frontend  | http://localhost:5173 |
| API health| http://localhost:3001/api/health |

**Two-terminal alternative:** root `npm run dev` and, separately, `cd frontend && npm run dev`.

### Step 8 — Verify

1. Open the frontend URL and confirm pages load.  
2. Open `/api/health` on the API port.  
3. Log in with the seeded admin or register a new user.

If only the frontend runs, the UI may appear but authenticated requests will fail until the API is running.

---

## Quick reference (after setup)

```bash
npm run dev:all          # API + Vite from repo root
npm run db:seed          # Re-run seed (admin + sectors)
```

Vite **`/api` proxy** can break some POST bodies; **prefer `VITE_API_URL=http://localhost:3001`** in `frontend/.env.development`.

## After backend code changes

Backend runs compiled code from `dist/`. After changing backend source:

1. **Rebuild:** `npm run build`
2. **Restart** the API process (e.g. stop with Ctrl+C, then run `npm start` again).

If you don’t restart, the running process will keep using the old build and new routes or logic won’t apply (e.g. admin or provider endpoints may 404).

**Optional checks after restart:**

Run API tests: `npm test` (requires seeded DB: `npm run db:seed`)
Smoke-test a running server: `npm run smoke-test` (default: `http://localhost:3001`; set `BASE_URL` for another host)

## Scripts

### Root (backend)

 Script          - Description              
----------------   -------------------------
 `npm run build` - Compile TypeScript       
 `npm start`     - Run compiled API         
 `npm test`      - Run API integration tests 
 `npm run smoke-test` - Hit key endpoints on a running server (optional) 
 `npm run db:push`   - Push schema to DB  
 `npm run db:migrate`- Apply migrations (`prisma migrate deploy`) 
 `npm run db:seed`   - Seed admin + sectors 
 `npx prisma studio` - Open Prisma Studio (from root) 

### Frontend

 Script           - Description        
----------------   --------------------
 `npm run dev`    - Start Vite dev     
 `npm run build`  - Production build   
 `npm run preview`- Preview prod build 

## Project layout

```
eewa-platform/
├── src/                 # Backend (Express, Prisma)
├── prisma/
│   └── schema.prisma
├── frontend/             # Vite + React
│   ├── src/
│   │   ├── api/         # API client
│   │   ├── contexts/    # Auth
│   │   ├── components/
│   │   └── pages/
│   └── package.json
├── docs/
├── package.json
└── README.md
```

## Environment (backend .env)

 Variable    -  Description                    
-------------   -------------------------------
 DATABASE_URL- PostgreSQL connection string 
 JWT_SECRET  - Min 32 characters            
 ENCRYPTION_KEY - 64 hex chars (AES-256)    
 CORS_ORIGIN   - Default `http://localhost:5173` 

See `.env.example` for a full list.
