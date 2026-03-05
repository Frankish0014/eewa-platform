# EEWA Backend — Folder Structure

```
src/
├── config/
│   └── index.ts              # Env validation (Zod), typed config
├── core/
│   ├── types.ts              # Role, JwtPayload, AuthenticatedRequest
│   ├── errors.ts             # AppError, Unauthorized, Forbidden, NotFound, Validation
│   └── container.ts          # DI container placeholder
├── common/
│   ├── logger.ts             # Winston logger
│   └── encryption.ts         # AES-256-GCM for sensitive fields
├── middleware/
│   ├── auth.ts               # JWT auth middleware
│   ├── rbac.ts               # Role-based access (allowedRoles)
│   ├── validate.ts           # Zod request validation
│   ├── errorHandler.ts       # Global error handler
│   └── index.ts
├── features/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   ├── token.service.ts
│   │   ├── validators.ts     # loginSchema, refreshSchema
│   │   └── index.ts
│   ├── projects/             # Project + Milestone (repository placeholder)
│   ├── mentoring/            # Mentor matching (service placeholder)
│   ├── opportunities/        # Opportunity repo (listVerified)
│   ├── messaging/            # Secure messaging (placeholder)
│   ├── notifications/        # NotificationService (email abstraction)
│   ├── audit/                # AuditService (log actions)
│   └── reporting/            # Dashboard (placeholder)
├── app.ts                    # Express app, route wiring, DI
└── server.ts                 # HTTP server, graceful shutdown

prisma/
└── schema.prisma             # Full normalized schema
```

## Next steps (your remaining deliverables)

- **Project + Milestone module**: Controllers, services, repositories with transaction-safe CRUD; owner-only edit enforced in service + RBAC.
- **Mentor matching algorithm**: Implement `matchBySector` with sector index, optional caching.
- **Opportunity verification workflow**: Admin verify/reject endpoints, status transitions, audit log.
- **Notification service**: Wire to nodemailer/SendGrid using `NotificationService`.
- **Audit logging middleware**: Attach `AuditService` to login, project edits, mentor assign, opportunity approve.
- **Unit test structure**: Vitest, mocks for repos and token service, example auth tests.
- **Docker**: Dockerfile + docker-compose for API + PostgreSQL.
