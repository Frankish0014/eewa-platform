# EEWA — Entrepreneur Empowerment Web Application

Platform for African student entrepreneurs: projects, milestones, mentor matching, opportunities, and secure messaging.

**Hosting (public URL):** See **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** — Docker, Render, Neon Postgres, env vars (`DATABASE_URL`, `CORS_ORIGIN`, optional SMTP).

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** (local or Docker)

## Quick start

### 1. Backend (API)

```bash
# From project root

npm install
npx prisma generate
# Choose one: sync schema
npx prisma db push          # quick dev sync (no migration files)
# or: npx prisma migrate dev  # if you use migrations from prisma/migrations

npm run dev                 # API at http://localhost:3001 (or PORT in .env). Production: npm run build && npm start
```

### 2. Frontend

```bash
# From project root
cd frontend
npm install
npm run dev                 # App at http://localhost:5173
```

### 3. Run both

**Easiest — one command** (from project root, after `npm install` here and in `frontend/`):

```bash
npm run dev:all
```

This starts the **API on :3001** and **Vite on :5173**. If you only run `cd frontend && npm run dev`, the UI will load but **`GET /api/me` will fail with connection refused** until the API is running.

Alternatively, use **two terminals**:

| Terminal 1 (backend) | Terminal 2 (frontend) |
|----------------------|------------------------|
| `npm run dev`        | `cd frontend && npm run dev` |

**Frontend:** http://localhost:5173  
**API:** http://localhost:3001 (or your `PORT`)  
**Health:** http://localhost:3001/api/health (or the port in your `.env`)

**Recommended:** `frontend/.env.development` sets `VITE_API_URL=http://localhost:3001` so the browser talks to the API **directly** (the Vite `/api` proxy can break some POST bodies, e.g. account delete). Restart `npm run dev` in `frontend/` after changing env. If you omit it, same-origin proxy is used.

First user (login)

Seed an admin user, then log in from the frontend:

```bash
npx prisma db seed
```

This creates **admin@eewa.dev** / **AdminPassword1!**. Use these credentials on the login page.

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
