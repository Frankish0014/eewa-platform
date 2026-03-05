# EEWA — High-Level System Architecture

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│                    (Web / Mobile / Future API consumers)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY / EXPRESS                              │
│  • HTTPS only • Rate limiting • Request validation (Zod) • CORS             │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MIDDLEWARE PIPELINE                                 │
│  Request → Logger → Auth (JWT) → RBAC → Validator → Controller              │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FEATURE MODULES (Modular Monolith)                       │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────────┐ ┌──────────────┐     │
│  │  Auth   │ │ Users   │ │ Projects │ │ Mentoring   │ │ Opportunities│     │
│  └────┬────┘ └────┬────┘ └────┬─────┘ └──────┬──────┘ └──────┬───────┘     │
│       │           │           │               │                │             │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────────┐ ┌──────────────┐     │
│  │Messaging│ │ Notify  │ │  Audit   │ │  Reporting  │ │   Admin      │     │
│  └────┬────┘ └────┬────┘ └────┬─────┘ └──────┬──────┘ └──────┬───────┘     │
└───────┼───────────┼───────────┼──────────────┼───────────────┼─────────────┘
        │           │           │              │               │
        └───────────┴───────────┴──────────────┴───────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
            ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
            │   Service    │   │  Repository  │   │   External    │
            │   (Logic)    │   │  (Prisma)    │   │   (Email)     │
            └──────┬───────┘   └──────┬───────┘   └──────────────┘
                   │                  │
                   └────────┬─────────┘
                            ▼
            ┌───────────────────────────────────┐
            │         PostgreSQL                │
            │  (Transactions, Indexes, FKs)     │
            └───────────────────────────────────┘
```

## 2. Design Decisions

| Decision | Rationale |
|----------|------------|
| **Modular monolith** | Clear boundaries per feature, easier to extract services later; single deploy and DB. |
| **Feature-based folders** | Each feature owns Controller → Service → Repository; reduces cross-feature coupling. |
| **Repository layer** | Abstracts Prisma; enables testing with mocks and future DB swap if needed. |
| **Dependency injection** | Services receive repos and config via constructor; testable and explicit dependencies. |
| **JWT + RBAC middleware** | Stateless auth; RBAC enforced at route level and in services for defense in depth. |
| **Audit as first-class feature** | Dedicated audit module and middleware for login, project edits, mentor assignments, opportunity approvals. |
| **Notification abstraction** | Email (and future channels) behind an interface; no business logic depending on transport. |

## 3. Data Flow (Examples)

- **Login**: `AuthController` → `AuthService` (validate, issue JWT) → `AuditService.logLogin()` → response.
- **Project edit**: `ProjectsController` → RBAC (owner only) → `ProjectService.update()` → `AuditService.logProjectEdit()` → `ProjectRepository` in transaction.
- **Mentor match**: `MentoringController` → `MentorMatchingService.matchBySector()` → `MentorAssignmentRepository`; audit log for assignment.
- **Opportunity**: `OpportunityService.create()` → status `PENDING`; Admin approves → status `VERIFIED` → `AuditService`; only `VERIFIED` listed publicly.

## 4. Security Layering

- **Transport**: HTTPS only (enforced at reverse proxy / server).
- **Auth**: JWT in `Authorization: Bearer`; refresh strategy and 15-min inactivity (session store or token expiry).
- **RBAC**: Middleware checks role/permission; services re-validate ownership (e.g. project owner).
- **Sensitive data**: AES-256 for PII/sensitive fields (key from env, key rotation path).
- **Audit**: Immutable logs for login, project edits, mentor assignments, opportunity approvals; GDPR-compliant retention.

## 5. Performance Targets

- Login: < 2s (index on email, minimal payload).
- Project CRUD: < 3s (indexed queries, bounded result sets).
- Mentor matching: < 5s (sector index, optional caching).
- Concurrency: 500 users (connection pool, stateless design, async I/O).

---

*This document is the single source of truth for high-level structure; feature-specific details live in each module.*
