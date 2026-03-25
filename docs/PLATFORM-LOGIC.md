# EEWA Platform — Full Logic & Functionality

This document describes the end-to-end logic of the EEWA platform: roles, flows, APIs, and business rules.

---

## 1. Authentication & roles

### Registration & login
- **POST /api/auth/register**: Body `{ email, password, role, firstName, lastName }`. Role must be one of: `Student`, `Mentor`, `Admin`, `InstitutionStaff`, `OpportunityProvider`. Password is hashed (bcrypt); user is created in DB.
- **POST /api/auth/login**: Body `{ email, password }`. Returns `{ accessToken, refreshToken, expiresIn }`. JWT payload includes `sub` (userId), `email`, `role`.
- **POST /api/auth/refresh**: Body `{ refreshToken }`. Returns new access token.
- **GET /api/me**: Requires Bearer token. Returns `{ user: { userId, email, role } }` from JWT.

### Frontend auth
- Access token stored in `localStorage` (`accessToken`). Refresh token in `refreshToken`.
- API client attaches `Authorization: Bearer <token>` to all requests. On 401, attempts refresh then retries once; if refresh fails, clears storage and emits `auth:logout`.
- Protected routes: if no token, redirect to `/login`. Layout and nav use `user.role` from `/api/me` (or decoded from token) to show role-specific links.

### Roles and access
| Role | Purpose |
|------|--------|
| **Student** | Owns ventures (projects), requests mentors, sees verified opportunities. |
| **Mentor** | Has mentor profile (sectors, bio), receives mentorship requests, accepts/declines. |
| **Admin** | Verifies opportunities, views users, ventures overview, audit log, and reports. |
| **OpportunityProvider** | Creates opportunities (pending until admin verifies), sees ventures overview, “My opportunities”. |
| **InstitutionStaff** | Read-only reporting role; can view the aggregated reports summary but not manage users, ventures, or opportunities. |

---

## 2. Profile

- **GET /api/profile**: Authenticated. Returns current user’s profile (from User + optional encrypted phone etc.).
- **PATCH /api/profile**: Authenticated. Body per `updateProfileSchema`. Updates user profile (e.g. name, phone); no role change from here.

---

## 3. Sectors (reference data)

- **GET /api/sectors**: No auth required. Returns list of sectors `{ id, name, description }`. Used for venture sector, mentor profile sectors, opportunity sector, and “Find a mentor” filter.

---

## 4. Ventures (projects) — Student-owned

### Model (summary)
- **Project**: `ownerId`, `sectorId`, `title`, `description`, `status` (DRAFT | ACTIVE | COMPLETED | ARCHIVED), plus fundability fields (problemStatement, targetMarket, businessModel, fundingAmountSought, fundingUse, stage, legalStatus, country, teamSize, website, impactDescription, traction, registrationNumber).
- **Milestone**: Belongs to a project; `title`, `description`, `dueDate`, `completedAt`, `orderIndex`.

### APIs
- **GET /api/projects**: Authenticated. Returns projects where `ownerId = req.user.userId` (with sector name). Used by Ventures page and Find a mentor (venture selector).
- **POST /api/projects**: Authenticated. Body per `projectCreateSchema`. Creates project with `ownerId = req.user.userId`. Audit: PROJECT_CREATE.
- **GET /api/projects/:id**: Authenticated. Returns one project; must be owner (enforced in service).
- **PATCH /api/projects/:id**: Authenticated. Body per `projectUpdateSchema`. Only owner can update. Audit: PROJECT_UPDATE.
- **DELETE /api/projects/:id**: Authenticated. Only owner can delete. Cascade deletes milestones and mentor assignments. Audit: PROJECT_DELETE.
- **GET/POST /api/projects/:id/milestones**, **GET/PATCH/DELETE /api/projects/:id/milestones/:milestoneId**, **GET .../milestones/progress**: Authenticated, owner-only. CRUD milestones and progress.

### Business rules
- Project must have valid `sectorId` (FK to Sector).
- Owner is always the logged-in user; no transfer of ownership.

---

## 5. Mentorship flow

### Model
- **MentorProfile**: One per Mentor user. `userId`, `bio`, `maxMentees`, `isActive`. Linked to sectors via **MentorSector** (many-to-many).
- **MentorAssignment**: Links a project to a mentor. `projectId`, `mentorId` (MentorProfile id), `menteeId` (User id = project owner). `status`: `REQUESTED` | `ACTIVE` | `REJECTED`. Unique on `(projectId, mentorId)`.

### Mentor profile (Mentor only)
- **GET /api/mentor/profile**: Mentor role. Returns profile with `sectorIds`, `sectorNames`, bio, maxMentees, isActive.
- **PATCH /api/mentor/profile**: Mentor role. Body per `mentorProfileSchema` (e.g. `bio`, `maxMentees`, `isActive`, `sectorIds`). Upserts profile and replaces MentorSector rows so mentor appears in “Find a mentor” for selected sectors.

### Find a mentor (Student)
- **GET /api/mentors?sectorId=**: Authenticated. Returns mentors who have that sector in their profile and `isActive = true`. Response: list with `id` (MentorProfile id), name, bio, sectorIds, sectorNames.
- **POST /api/projects/:id/mentor-requests**: Student role. Body `{ mentorId }` (MentorProfile id).  
  **Logic**:
  1. Project must exist and `project.ownerId === req.user.userId`.
  2. Mentor profile must exist, be active, and include the project’s sector.
  3. No existing MentorAssignment for this (projectId, mentorId).
  4. Creates MentorAssignment with `status: 'REQUESTED'`.
  5. Creates notifications: for mentor → “New mentorship request”; for mentee → “Mentorship request sent”.
  Returns `{ id: assignmentId }`.

### Mentor requests (Mentor only)
- **GET /api/mentor/requests**: Mentor role. Returns list of MentorAssignments for this mentor: id, projectId, projectTitle, menteeId, menteeName, status, assignedAt.
- **PATCH /api/mentor/requests/:assignmentId**: Mentor role. Body `{ accept: boolean }`.  
  **Logic**:
  1. Assignment must exist and `mentorId` = current mentor’s profile id.
  2. Current status must be `REQUESTED`.
  3. Updates status to `ACTIVE` (accept) or `REJECTED` (decline).
  4. Creates notification for mentee: “Mentorship request accepted” or “Mentorship request declined”.
  5. Audit: MENTOR_ASSIGN or MENTOR_UNASSIGN.

### Student experience
- Student picks sector on Find a mentor → sees mentors in that sector → picks venture and mentor → sends request.
- Student sees notifications: “Mentorship request sent”, then either “Mentorship request accepted” (link to Ventures) or “Mentorship request declined” (link to Find a mentor). Notifications are created on request and on mentor response; backfill on list ensures old assignments get a notification row if missing.

---

## 6. Notifications

### Model
- **Notification**: `userId`, `type`, `title`, `message`, `link`, `readAt`, `createdAt`. User-scoped.

### APIs
- **GET /api/notifications**: Authenticated. Returns notifications for `req.user.userId`. Before returning, **backfill** runs for mentees: for each MentorAssignment where menteeId = userId, if no matching notification exists, create one (MENTOR_REQUESTED / MENTOR_ACCEPTED / MENTOR_DECLINED) so old requests show up. Then returns repo list (newest first, limit 100).
- **PATCH /api/notifications/:id/read**: Authenticated. Sets `readAt = now()` for that id and userId.
- **POST /api/notifications/read-all**: Authenticated. Sets `readAt = now()` for all notifications for that user where `readAt` is null.

### When notifications are created
- **Student requests mentor**: Mentor gets MENTOR_REQUEST; student gets MENTOR_REQUESTED (link includes mentorAssignmentId).
- **Mentor accepts**: Student gets MENTOR_ACCEPTED (link to projects).
- **Mentor declines**: Student gets MENTOR_DECLINED (link to mentors).
- **New mentorship message**: Recipient gets `MESSAGE_RECEIVED` (“New message” + preview); link opens **Messages** with `?conversationId=…`. Bell shows a 💬 prefix for this type.

Links include query params (e.g. `mentorAssignmentId`) for deduplication in backfill.

---

## 6a. Secure messaging (mentor ↔ student)

### Rules
- Only **Student** and **Mentor** roles can use messaging APIs and the **Messages** page.
- A user may message another user only if there is an **`ACTIVE` `MentorAssignment`** between them (student as `menteeId`, mentor via `MentorProfile.userId`).
- Conversations are **1:1** (two participants). Opening a chat with the same peer reuses the existing conversation.

### Storage
- **`Message.bodyEnc`**: AES-256-GCM ciphertext using app **`ENCRYPTION_KEY`** (same 32-byte hex key as other encrypted fields).

### APIs
- **GET /api/messages/eligible-peers**: Lists active mentorship peers (mentor user or mentee user) with project context; used to start a thread.
- **GET /api/conversations**: Lists conversations for the current user with last-message preview and unread counts.
- **POST /api/conversations**: Body `{ peerUserId }`. Opens or returns existing direct conversation id `{ conversationId }`.
- **GET /api/conversations/:id/messages**: Query `limit` (optional), `before` (optional ISO cursor). Marks inbound messages as read for the current user.
- **POST /api/conversations/:id/messages**: Body `{ body }` (1–10000 chars). Sends a message.

### Frontend
- **`/messages`**: Conversation list + thread + composer; nav link for Student and Mentor.

---

## 7. Opportunities

### Model
- **Opportunity**: `providerId` (User), `sectorId`, `title`, `description`, `link`, `status`: PENDING | VERIFIED | REJECTED. `verifiedById`, `verifiedAt` set when admin verifies/rejects.

### Provider (OpportunityProvider role)
- **GET /api/opportunities/mine**: Returns opportunities where `providerId = req.user.userId`.
- **POST /api/opportunities**: Body per `opportunityCreateSchema`. Creates opportunity with `status: PENDING`.
- **PATCH /api/opportunities/:id**: Provider only for own opportunity. Updates sector, title, description, link (not status).

### Admin
- **GET /api/opportunities/pending**: Admin role. Returns opportunities with `status: PENDING`.
- **PATCH /api/opportunities/:id/verify**: Admin role. Body `{ approve: boolean }`. Sets status to VERIFIED or REJECTED, sets verifiedById and verifiedAt.

### Students / all authenticated
- **GET /api/opportunities**: Authenticated. Optional query `sectorId`. Returns opportunities with `status: VERIFIED` only (and filtered by sector if provided).

---

## 8. Provider ventures overview

- **GET /api/provider/ventures-overview**: OpportunityProvider role. Returns same shape as admin ventures overview (e.g. summary of ventures/projects). Used by provider dashboard.

---

## 9. Admin

- **GET /api/admin/ping**: No auth. Returns `{ ok: true }` (health check for admin routes).
- **GET /api/admin/ventures-overview**: Admin role. Returns overview (e.g. total ventures, by status/sector).
- **GET /api/admin/users**: Admin role. Returns list of users (e.g. id, email, role, name).
- **GET /api/admin/audit-log**: Admin role. Returns audit log entries (e.g. userId, action, resourceType, resourceId, createdAt).
- **GET /api/admin/opportunities**: Admin sees pending opportunities via **GET /api/opportunities/pending** and verifies via **PATCH /api/opportunities/:id/verify**.

(Exact route paths may be under a router; see `src/app.ts` for full list.)

---

## 10. Reporting

- **GET /api/reports/summary**: Admin or InstitutionStaff. Returns high-level summary (e.g. counts). Implementation may be placeholder.
- Frontend page `/reports` (ProtectedRoute) calls this endpoint and is visible in the sidebar and dashboard quick actions for Admin and InstitutionStaff.

---

## 11. Frontend routes (summary)

| Path | Role | Purpose |
|------|------|--------|
| /login, /register | — | Auth. |
| / | All | Dashboard (role-specific quick links). |
| /profile | All | User profile. |
| /projects | Student, Mentor | Ventures list; create/edit/delete projects and milestones. |
| /mentors | Student | Find a mentor by sector; request mentor for a venture. |
| /mentor/profile | Mentor | Mentor profile (sectors, bio, maxMentees, isActive). |
| /mentor/requests | Mentor | List mentorship requests; accept/decline. |
| /notifications | All | Full notifications list; mark read. |
| /messages | Student, Mentor | Secure messaging with active mentorship peers. |
| /opportunities | Student, Mentor | List verified opportunities (optional sector filter). |
| /admin/opportunities | Admin | Pending opportunities; verify/reject. |
| /admin/users | Admin | Users list. |
| /admin/ventures | Admin | Ventures overview. |
| /admin/audit | Admin | Audit log. |
| /provider/opportunities | OpportunityProvider | My opportunities CRUD. |
| /provider/entrepreneurs | OpportunityProvider | Entrepreneurs/ventures overview. |

Layout shows a notification bell (dropdown + link to /notifications). Nav items are shown/hidden by role.

---

## 12. Error handling & validation

- **Validation**: Routes use `validate(schema)` middleware (Zod). Invalid body → 400 with details.
- **Auth**: Missing or invalid JWT → 401. Wrong role (RBAC) → 403.
- **Business rules**: Controllers/services throw `NotFoundError` (404), `ForbiddenError` (403). Global error handler maps these to JSON and logs 500 for unhandled errors.

---

## 13. Data flow summary

1. **Student**: Registers → creates ventures → finds mentor by sector → requests mentor for a venture → gets notifications (request sent, then accepted/declined). Can browse verified opportunities.
2. **Mentor**: Registers → sets mentor profile (sectors, bio) → receives requests on Mentorship requests → accepts or declines → student is notified.
3. **OpportunityProvider**: Registers → creates opportunities (PENDING) → admin verifies → students see verified opportunities.
4. **Admin**: Verifies/rejects opportunities; views users, ventures overview, audit log.
5. **Notifications**: Created on mentor request and mentor response; list endpoint backfills from MentorAssignment for mentees so history is visible. Read state stored in DB; bell and Notifications page use same API.

This is the full logic functionality of the platform as implemented.
