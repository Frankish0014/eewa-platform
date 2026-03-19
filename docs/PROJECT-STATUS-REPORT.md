# EEWA Platform — Project Status Report

**Report date:** March 2025  
**Scope:** Full platform (backend API, frontend, notifications, mentor flows, testing, deployment docs)

---

## Status: **On track**

The platform is on track against current goals. Core user journeys are implemented end-to-end: auth, ventures (projects/milestones), mentor matching and request/response flow, opportunities (list/verify/provider), admin and provider dashboards, and in-app notifications. Backend and frontend are integrated with documented runbooks, automated smoke tests, and API integration tests for critical paths. Remaining work is largely deployment validation, optional enhancements (email, messaging), and operational hardening.

---

## Key achievements (since last stand-up)

### Mentor and student flows
- **Mentor access to mentorship requests:** Mentors can open **Mentorship requests** (`/mentor/requests`) from the sidebar and dashboard to see all requests (REQUESTED, ACTIVE, REJECTED) and **Accept** or **Decline** pending ones. Backend already exposed `GET /api/mentor/requests` and `PATCH /api/mentor/requests/:assignmentId`; frontend now includes the page, API client methods (`getMentorRequests`, `respondToMentorRequest`), and nav/dashboard links.
- **Find a mentor (students):** Students continue to use **Find a mentor** by sector, request a mentor for a venture, and are notified when a mentor accepts or declines (see below).

### In-app notifications
- **Notification model and API:** New `Notification` table (Prisma) and backend support: create notifications when a student requests a mentor (notify mentor) and when a mentor accepts/declines (notify student). Endpoints: `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `POST /api/notifications/read-all`.
- **Notification bell (Layout):** Bell in the main header shows an unread count, dropdown with recent notifications (title, message, relative time), and click-through to the relevant page (e.g. Mentorship requests). Read state is persisted server-side; no dependency on localStorage for “read.”
- **Notifications page:** Full **Notifications** page at `/notifications` with list, mark-as-read on click, and **Mark all as read**. Sidebar link **Notifications** added for all authenticated users; bell dropdown includes **View all notifications** to this page.
- **Resilience:** Notifications list endpoint returns an empty list on failure (e.g. missing `Notification` table) so the UI does not 500; backend logs the error.

### Quality and runbooks
- **Smoke test:** `npm run smoke-test` covers health, admin ping, login, opportunities (auth), admin ventures overview, and **provider ventures overview** (admin receives 403, confirming route and RBAC). Usable against a running server or deployed API via `BASE_URL`.
- **API integration tests:** `npm test` covers auth (login), opportunities list and sector filter, admin ventures overview, unauthenticated 401, and **provider ventures overview** (403 for admin). Requires seeded DB (`npm run db:seed`).
- **README:** “After backend code changes” documents rebuild (`npm run build`), restart, and optional `npm test` / `npm run smoke-test`.
- **DEPLOYMENT.md:** Deployment options (all-in-one vs split), env vars (including CORS, `VITE_API_URL`), and **Validate after deploy** (CORS, env, proxy/API URL, smoke-test against live URL). Checklist before go-live included.

### Platform breadth (recap)
- **Roles:** Student, Mentor, Admin, OpportunityProvider (and InstitutionStaff for reporting). Role-based nav and dashboards in place.
- **Backend:** 38+ route handlers across auth, profile, projects/milestones, mentors (profile, list by sector, request/respond), notifications (list, mark read, mark all read), opportunities (list verified, mine, create/update, pending, verify), provider ventures overview, admin (users, audit, ventures overview), reporting.
- **Frontend:** 16+ pages (Dashboard, Profile, Projects, Find mentor, Mentor profile, Mentorship requests, Notifications, Opportunities, Admin opportunities/users/ventures/audit, Provider opportunities/entrepreneurs, Login, Register). Layout includes notification bell and role-based sidebar links.

---

## Challenges

1. **Build/tooling (Babel parser):** Some environments (e.g. Vite + `vite:react-babel`) require an explicit `catch` parameter in `try/catch` (e.g. `catch (_)` instead of `catch {`). Missing clauses caused 500s when compiling pages (e.g. NotificationsPage, MentorRequests). **Mitigation:** All `try/catch` in affected frontend files use `catch (_)` (or a named parameter). If similar errors appear elsewhere, apply the same pattern.
2. **Database schema sync:** The `Notification` table must exist for notification creation and listing. If the schema was updated but DB not updated, creation/list can fail. **Mitigation:** Notifications list API catches errors and returns an empty list so the app does not 500; README and deployment docs reference `npx prisma db push` (or migrations) after schema changes.
3. **Deployment not yet validated:** Staging/production deployment and validation (CORS, env, proxy/API URL, smoke-test against live URL) are documented but need to be executed and confirmed in a real environment.
4. **Optional / future work:** Email delivery (NotificationService), secure messaging (Message/Conversation models exist; full flow TBD), 2FA (schema ready), and Docker/CI are not yet implemented and may be planned for a later phase.

---

## Next steps

1. **Deploy and validate**
   - Deploy backend and frontend per **DEPLOYMENT.md** (e.g. Railway/Render + Vercel/Netlify, or all-in-one).
   - Run **Validate after deploy**: set `CORS_ORIGIN` and `VITE_API_URL`, confirm CORS from frontend origin, run `BASE_URL=<api-url> npm run smoke-test`, and complete the checklist before go-live.

2. **Database**
   - Ensure production DB has schema applied (`npx prisma db push` or `npx prisma migrate deploy`).
   - Seed admin (and optionally test users) where needed: `npx prisma db seed`.

3. **Operational**
   - After any backend change: rebuild (`npm run build`), restart API, and optionally run `npm test` and `npm run smoke-test` (locally or against staging).
   - Consider adding a short runbook or CI step that runs smoke-test against a deployed URL on release.

4. **Optional enhancements (backlog)**
   - Wire **NotificationService** to an email provider (e.g. SendGrid/nodemailer) for key events (e.g. new mentor request, mentor response).
   - Implement **secure messaging** (conversations, send/receive) using existing Message/Conversation schema and APIs if in scope.
   - Add **Docker** (Dockerfile + docker-compose for API + Postgres) for consistent local and deployment environments.
   - **2FA:** Schema and types are ready; implement flow when prioritised.

---

## Summary

| Area              | Status   | Notes                                                                 |
|-------------------|----------|-----------------------------------------------------------------------|
| Mentor requests   | Done     | Mentors see and accept/decline; students request from Find a mentor.  |
| In-app notifications | Done   | DB, API, bell, full page, mark read; event-driven for mentor flow.    |
| Smoke test        | Done     | Health, admin, auth, opportunities, admin + provider routes.          |
| API tests         | Done     | Auth, opportunities (list/filter), admin + provider ventures.        |
| README / runbook  | Done     | Rebuild, restart, optional test and smoke-test.                      |
| Deployment docs   | Done     | DEPLOYMENT.md with options, env, validation, checklist.              |
| Deploy to staging | Pending  | Follow DEPLOYMENT.md and validate CORS, env, proxy, smoke-test.      |
| Email / messaging / 2FA | Backlog | Documented or schema-ready; implement when prioritised.        |

Overall, the platform is **on track** with core functionality and quality measures in place; the main follow-up is executing deployment and validation in a real environment.
