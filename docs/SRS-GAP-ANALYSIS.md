# SRS gap analysis (EEWA)

> **See also:** [`SRS-COMPLIANCE-REVIEW.md`](./SRS-COMPLIANCE-REVIEW.md) — **traceability to your Word SRS** (`EEWA SRS DOC.docx`), FR-by-FR status, NFRs, business rules, and **extensions to keep**.

## Important note

The **SRS is now in the repo** as **`docs/EEWA SRS DOC.docx`**. The detailed requirement-by-requirement review lives in **`SRS-COMPLIANCE-REVIEW.md`**.

The remainder of this file is a **shorter gap analysis against**:

- `docs/ARCHITECTURE.md` (intended modules: Messaging, Notify/email, Audit, Reporting, etc.)
- `docs/PROJECT-STATUS-REPORT.md` (explicit backlog: email, messaging, 2FA, Docker)
- `prisma/schema.prisma` (models that imply required features)
- The **actual implemented** routes and frontend pages in the codebase

**To align 100% with your SRS**, please add the SRS file to `docs/SRS.md` (or paste the requirements list) and we can turn this into a formal traceability matrix (REQ-ID → implementation/test).

---

## Implemented (core product)

| Area | Status | Notes |
|------|--------|--------|
| Auth (register/login/refresh/JWT) | Done | Roles in DB |
| Profile | Done | Institution shown when linked |
| Ventures (projects) + milestones | Done | Owner-scoped |
| Mentor discovery + requests + accept/decline | Done | Sector matching |
| In-app notifications | Done | Mentor flow + backfill |
| Opportunities (provider create, admin verify, student list) | Done | |
| Admin (users, audit, ventures overview) | Done | |
| Provider dashboards | Done | |
| Reporting summary | Done | Admin + InstitutionStaff |
| Responsive app shell | Done | Collapsible sidebar on small screens |

---

## Newly implemented in this pass (previously missing)

| Area | Status | Notes |
|------|--------|--------|
| **Secure messaging (mentor ↔ student)** | Done | **Active `MentorAssignment` only**; AES-256-GCM using existing `ENCRYPTION_KEY`; APIs + `/messages` UI |

Endpoints:

- `GET /api/messages/eligible-peers` — who you can message (active mentorships)
- `GET /api/conversations` — conversation list + preview + unread counts
- `POST /api/conversations` — `{ peerUserId }` open/get direct thread
- `GET /api/conversations/:id/messages` — paginated-ish (`limit`, `before`)
- `POST /api/conversations/:id/messages` — `{ body }` send (max 10k chars)

---

## Still typical SRS gaps / backlog (not implemented here)

These commonly appear in EEWA-style SRS docs and are **still not fully implemented** unless your SRS explicitly marks them out of scope:

| Area | Typical SRS expectation | Current state |
|------|-------------------------|---------------|
| **Email notifications** | Password reset, mentor request emails, etc. | Not wired (in-app notifications exist) |
| **2FA** | TOTP for high-privilege roles | Schema fields exist; **no user flow** |
| **Password reset / email verification** | Self-service account recovery | Not present |
| **Rate limiting / WAF** | Abuse protection | Not in Express app (often at proxy) |
| **File uploads** | Pitch decks, logos | Not present |
| **Payments / escrow** | Funding workflows | Not present |
| **Advanced search / analytics** | Institution dashboards beyond summary | Reporting is summary-only |
| **Docker / CI** | Reproducible deploy | Documented optionally; not guaranteed in repo |
| **i18n / a11y audit** | WCAG | Partial (some `aria`); not a full audit |

---

## Next step (recommended)

1. Add your SRS to `docs/SRS.md`.
2. We map each requirement to: **API route / page / test** (or mark **N/A**).
3. Prioritise remaining backlog (email vs 2FA vs password reset) in phased delivery.
