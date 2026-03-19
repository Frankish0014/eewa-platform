# Configuring EEWA with Supabase

Use this when you install the **Supabase** integration (e.g. in your host’s “Storage” or “Integrations” screen).

---

## In the “Install Integration” / Configuration modal

### 1. Primary Region (required)

- Choose the region closest to your users or your backend (e.g. **Washington, D.C., USA (East)** is fine).
- This is where your Supabase Postgres database will run.

### 2. Public Environment Variables Prefix

- **Set this to `VITE_`** (replace the default `NEXT_PUBLIC_`).
- EEWA’s frontend is **Vite + React**, so client-side env vars must use the `VITE_` prefix (e.g. `VITE_API_URL`). Using `VITE_` here ensures any Supabase-injected client vars are available in the frontend if you add them later.

### 3. Installation plan

- Select **Supabase Free Plan – $0/month** (Unlimited API requests, 500 MB database, etc.).

Then complete the installation (Install / Connect, etc.).

---

## After Supabase is connected

### Backend (API) – use Supabase as PostgreSQL

1. In the **Supabase** dashboard: **Project Settings → Database**.
2. Copy the **Connection string**. Use the **“URI”** or **“Connection pooling”** (Transaction mode) string. It looks like:
   ```text
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
3. In your **backend** env (e.g. `.env` or your host’s env vars), set:
   ```env
   DATABASE_URL="<paste-the-supabase-connection-string-here>"
   ```
   Replace `[password]` with your database password if the string contains a placeholder.

4. Run migrations (or push schema) once:
   ```bash
   npx prisma db push
   # or
   npx prisma migrate deploy
   ```
5. Seed if needed:
   ```bash
   npm run db:seed
   ```

### Frontend

- EEWA’s frontend talks to your **Express API**, not directly to Supabase. Keep **`VITE_API_URL`** set to your backend URL when building (e.g. `https://your-api.railway.app`). You do **not** need Supabase client env vars unless you add Supabase client SDK later.

### Optional: vars the host injects

If your host (e.g. Vercel) injects Supabase env vars after you install the integration, they might look like:

- `SUPABASE_URL` / `VITE_SUPABASE_URL`
- `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`

EEWA does not use these today. The only client-side URL the app needs is **`VITE_API_URL`** (your backend). You can leave any Supabase-injected vars for future use.

---

## Summary

| Where              | What to set |
|--------------------|------------|
| Install Integration | Primary Region: e.g. Washington, D.C. (East) |
| Install Integration | Public env prefix: **VITE_** |
| Install Integration | Plan: Supabase Free |
| Backend `.env` / host | **DATABASE_URL** = Supabase Postgres connection string |
| Frontend build      | **VITE_API_URL** = your backend API URL (unchanged) |
