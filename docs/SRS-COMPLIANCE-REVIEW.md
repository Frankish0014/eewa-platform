# SRS compliance review — EEWA platform

**SRS source:** `docs/EEWA SRS DOC.docx` (Entrepreneur Empowerment Web Application — Frank Ishimwe, ALU, Jan 2026)  
**Review:** Requirements traced to the implemented codebase. **Extensions you added** (not in the SRS FR table) are listed at the end and are **kept** — this document does not recommend removing them.

Plain-text extraction of the Word file is used for traceability (structure matches the SRS template: §2.2 Product Functions, §4 functional table, §5 NFRs, business rules).

---

## 1. Functional requirements (SRS table — FR 1–FR 10)

| Req ID | SRS description | Implementation status | Notes |
|--------|-----------------|----------------------|--------|
| **FR 1** | User registration (students, mentors, admins) via email/password | **Met** | `POST /api/auth/register`; roles include **Student, Mentor, Admin** plus **InstitutionStaff, OpportunityProvider** (extensions). |
| **FR 2** | Secured login; access based on roles | **Met** | JWT + `authMiddleware` + `rbacMiddleware`; refresh token flow. |
| **FR 3** | Profile management (skills, contact, bio) | **Partially met** | `GET/PATCH /api/profile` — name/contact-style fields; **mentor bio** on mentor profile. No dedicated **student “skills”** profile field in schema/UI as written in SRS. |
| **FR 4** | Project creation: title, sector, goals, description | **Met** | Projects + sector + rich description/fundability fields (meets or exceeds). |
| **FR 5** | Project milestone tracking | **Met** | Milestones API + UI on Projects. |
| **FR 6** | Matching mentor | **Met** | Sector-based mentor listing + **student-initiated** request (`POST .../mentor-requests`). SRS narrative also mentions **admin assigning mentors** in business rules — current product is **request/accept**, not admin-driven assignment. |
| **FR 7** | Project management: create, edit, track | **Met** | Full CRUD + milestones + progress endpoint. |
| **FR 8** | Opportunities listing; notify users (email **or** in-app) about new opportunities/deadlines | **Partially met** | Verified opportunities list + **in-app notifications** for mentorship events and **new messages**. **Email** notifications for opportunities (or deadlines) **not implemented**. Push within 10s of posting is **not** implemented (no real-time push). |
| **FR 9** | Messaging for mentor–mentee communication and feedback | **Met** | `/messages`, conversation APIs, encryption at rest for message bodies; **MESSAGE_RECEIVED** in-app notification. |
| **FR 10** | Admin review/reject/approve/publish opportunities | **Met** | Pending list + verify/reject; students see **VERIFIED** only. |

**Score (strict):** 7 fully met, 3 partially met (FR 3, FR 6 workflow nuance, FR 8 email/real-time).

---

## 2. Non-functional requirements (selected from SRS §5)

| Area | SRS expectation | Status |
|------|-----------------|--------|
| **NFR — RBAC + HTTPS (NFR 1 style)** | RBAC; encrypted transmission | **RBAC:** implemented. **HTTPS:** depends on **deployment** (reverse proxy), not the Node app alone. |
| **Performance** | Login &lt; 2s, projects &lt; 3s, opportunities &lt; 2s, etc. | **Not proven** in CI; plausible under normal load but **no load test** in repo. |
| **Responsive UI (NFR 3)** | Mobile + desktop | **Met** (responsive layout / sidebar behavior). |
| **Uptime 99%** | Operational | **Hosting/ops**; not enforced in code. |
| **Modular architecture (NFR 5)** | Maintainability | **Met** (feature modules, services, repos). |
| **Error handling / user-friendly messages (NFR 6)** | Availability | **Partially met** (API errors + frontend messages; not exhaustive). |
| **Password strength (Security section)** | SRS mentions **12-character** minimum with complexity | **Gap:** registration uses **minimum 8** characters (+ upper/lower/number). |
| **2FA for Admins** | Required in security narrative | **Not met** (schema hints only; **no 2FA flow**). |
| **Session 15 min inactivity** | Session expiry | **Partial:** JWT access token expiry is configurable (`JWT_EXPIRES_IN`, often 15m) but this is **not** the same as full **inactivity tracking** + forced logout everywhere. |
| **Audit logging** | Critical actions logged | **Met** for key actions (login, projects, mentor, opportunities per implementation). |
| **Daily backups / failover / read-only mode** | Safety section | **Not implemented** in application code (infrastructure). |
| **File upload safety** | No malicious uploads | **N/A / low risk** — **no file upload** feature implemented. |
| **80% test coverage** | Testability | **Not met** as a metric; smoke + API tests exist. |
| **Email / SMTP integration** | Software interfaces | **Not met** (in-app notifications substitute partially). |

---

## 3. Business rules vs implementation

| SRS business rule | Implementation |
|-------------------|----------------|
| Role-specific actions (student / mentor / admin) | **Met** via RBAC + ownership checks. |
| **Opportunity Provider** + **Program Coordinator / Institutional Staff** in narrative | **Met** as **OpportunityProvider** + **InstitutionStaff** (+ extended registration). |
| Mentor matching by **sector** + verified/active mentor | **Met** (sector alignment; active profile). |
| Unverified opportunities hidden from students | **Met**. |
| Project ownership | **Met** (owner-only edit). |
| Notifications filtered by relevance | **Met** for mentorship + messages; **no** opportunity “deadline” blast email. |
| **Application eligibility** before applying to opportunities | **Not implemented** — there is **no “apply to opportunity”** workflow with eligibility checks in the current app. |
| **Admin assigns mentors** (wording in rules) | **Not implemented** — flow is **student requests**, **mentor accepts/declines**. |
| Immutable audit logs | **Met** pattern (append-style logging). |

---

## 4. Platform extensions (not in SRS FR table) — **retain**

These improve or extend the SRS baseline; **do not remove** unless you explicitly descope:

- **InstitutionStaff** role, **institution name/country** on registration, **`/reports`** for staff + admin.
- **OpportunityProvider** as first-class registrable role (SRS mentions providers in business rules).
- **In-app notification bell**, **notification backfill**, **`MESSAGE_RECEIVED`** for chat.
- **Encrypted message bodies** (AES-GCM) in DB.
- **Smoke test** (`npm run smoke-test`) and **API tests** (`npm test`).
- **Debug / helper scripts** (e.g. notifications).
- **Provider ventures overview** endpoint mirroring admin shape (with RBAC).
- **Documentation set** (`PLATFORM-LOGIC.md`, `ARCHITECTURE.md`, this review, etc.).

---

## 5. Recommended next steps (to close SRS gaps)

1. **FR 3:** Add optional **student profile fields** (e.g. skills/interests) if supervisors require literal SRS wording.  
2. **FR 8:** Integrate **email** (SMTP/SendGrid) for opportunity published events (and optionally mentor events).  
3. **Security:** Align **password minimum** to SRS (**12** chars) if mandatory; implement **admin 2FA** or mark as “Phase 2” in SRS.  
4. **FR 8 / business rules:** Add **opportunity apply** + **eligibility** rules, or document as **out of scope** in SRS.  
5. **Business rules:** Either add **admin assign mentor** or update SRS to **student-initiated matching** (current behavior).  
6. **NFR:** Document **HTTPS, backups, uptime** as **deployment/infrastructure** responsibilities.

---

## 6. File reference

| Document | Location |
|----------|----------|
| Authoritative SRS (Word) | **`docs/EEWA SRS DOC.docx`** |
| This compliance review | `docs/SRS-COMPLIANCE-REVIEW.md` |
| Earlier gap notes | `docs/SRS-GAP-ANALYSIS.md` (links here) |

For version control and diffs, consider exporting the SRS to **`docs/SRS.md`** or committing PDF alongside the `.docx`.
