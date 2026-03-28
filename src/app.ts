/**
 * Express app bootstrap — routes, middleware, DI wiring.
 */
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './common/logger';
import { ValidationError } from './core/errors';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { rbacMiddleware } from './middleware/rbac';
import { validate } from './middleware/validate';
import {
  createAuthController,
  createAuthService,
  createAuthRepository,
  createTokenService,
  loginSchema,
  registerSchema,
  refreshSchema,
  emailOtpVerifySchema,
} from './features/auth';

import { PrismaClient } from '@prisma/client';
import { createProfileService, updateProfileSchema } from './features/users';
import { createProjectRepository, createProjectService, createProjectController } from './features/projects';
import { projectCreateSchema, projectUpdateSchema } from './features/projects/validators';
import {
  createMilestoneRepository,
  createMilestoneService,
  createMilestoneController,
  milestoneCreateSchema,
  milestoneUpdateSchema,
} from './features/milestones';
import {
  createMentorRepository,
  createMentorService,
  createMentorController,
  mentorProfileSchema,
  mentorRequestSchema,
  mentorRespondSchema,
} from './features/mentoring';
import {
  createOpportunityRepository,
  createOpportunityService,
  createOpportunityController,
  opportunityCreateSchema,
  opportunityUpdateSchema,
  opportunityVerifySchema,
  opportunityApplySchema,
} from './features/opportunities';
import { createEmailDelivery } from './features/notifications/email-delivery';
import { createReportingService, createReportingController } from './features/reporting';
import { createAuditService } from './features/audit';
import { createAdminController } from './features/admin';
import {
  createNotificationRepository,
  createNotificationListService,
  createNotificationListController,
} from './features/notifications';
import {
  createMessagingRepository,
  createMessagingService,
  createMessagingController,
  openConversationSchema,
  sendMessageSchema,
  listMessagesQuerySchema,
} from './features/messaging';
import { attachStaticFrontend } from './static-frontend';

const prisma = new PrismaClient();
const tokenService = createTokenService();
const authRepo = createAuthRepository(prisma);
const emailDelivery = createEmailDelivery(config);
const auditServiceEarly = createAuditService(prisma);
const authService = createAuthService({
  authRepo,
  tokenService,
  prisma,
  emailDelivery,
  auditService: auditServiceEarly,
});
const authController = createAuthController(authService);
const profileService = createProfileService(prisma, auditServiceEarly);
const projectRepo = createProjectRepository(prisma);
const projectService = createProjectService(projectRepo);
const projectController = createProjectController(projectService, auditServiceEarly);
const milestoneRepo = createMilestoneRepository(prisma);
const milestoneService = createMilestoneService(milestoneRepo);
const milestoneController = createMilestoneController(milestoneService);
const mentorRepo = createMentorRepository(prisma);
const mentorService = createMentorService(mentorRepo);
const auditService = auditServiceEarly;
const notificationRepo = createNotificationRepository(prisma);
const notificationListService = createNotificationListService(notificationRepo, prisma);
const notificationListController = createNotificationListController(notificationListService);
const mentorController = createMentorController(
  mentorService,
  auditService,
  notificationListService
);
const opportunityRepo = createOpportunityRepository(prisma);
const opportunityService = createOpportunityService(opportunityRepo, {
  onOpportunityVerified: async (opp) => {
    const students = await prisma.user.findMany({
      where: {
        role: 'Student',
        projects: { some: { sectorId: opp.sectorId } },
      },
      select: { email: true },
    });
    const body = [
      `A new verified opportunity in ${opp.sectorName} is available on EEWA.`,
      `Title: ${opp.title}`,
      opp.description ? `\n${opp.description}` : '',
      opp.link ? `\nApply / details: ${opp.link}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    for (const s of students) {
      try {
        await emailDelivery.sendMail(s.email, `[EEWA] New opportunity: ${opp.title}`, body);
      } catch (err) {
        logger.warn('Opportunity verification email failed', { to: s.email, message: String(err) });
      }
    }
  },
});
const opportunityController = createOpportunityController(opportunityService, auditService);
const reportingService = createReportingService(prisma);
const reportingController = createReportingController(reportingService);
const adminController = createAdminController(prisma);
const messagingRepo = createMessagingRepository(prisma);
const messagingService = createMessagingService(messagingRepo, notificationListService);
const messagingController = createMessagingController(messagingService);

const app = express();

/** Dev: allow both localhost and 127.0.0.1 for Vite + VITE_API_URL cross-origin. Always allow Authorization + JSON. */
const corsOrigin =
  config.NODE_ENV === 'development'
    ? [...new Set([config.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'])]
    : config.CORS_ORIGIN;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, _res, next) => {
  logger.info({ method: req.method, path: req.path });
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Public auth routes (no JWT)
app.post('/api/auth/register', validate(registerSchema), (req, res, next) => {
  authController.register(req, res).catch(next);
});
app.post('/api/auth/login', validate(loginSchema), (req, res, next) => {
  authController.login(req, res).catch(next);
});
app.post('/api/auth/verify-email-otp', validate(emailOtpVerifySchema), (req, res, next) => {
  authController.verifyEmailOtp(req, res).catch(next);
});
app.post('/api/auth/refresh', validate(refreshSchema), (req, res, next) => {
  authController.refresh(req, res).catch(next);
});

// ─── Protected routes (require JWT)
app.get('/api/me', authMiddleware(tokenService), (req, res) => {
  res.json({ user: req.user });
});

// ─── Admin (Router so /api/admin/* is always matched)
const adminRouter = express.Router();
adminRouter.get('/users', (req, res, next) => {
  adminController.listUsers(req, res).catch(next);
});
adminRouter.get('/audit-log', (req, res, next) => {
  adminController.listAuditLog(req, res).catch(next);
});
adminRouter.get('/ventures-overview', (req, res, next) => {
  adminController.listVenturesOverview(req, res).catch(next);
});
// Ping first so it's not under auth (to verify admin routes are loaded)
app.get('/api/admin/ping', (_req, res) => {
  res.json({ ok: true, message: 'Admin routes loaded' });
});
// Explicit app-level route so /api/admin/ventures-overview always matches
app.get(
  '/api/admin/ventures-overview',
  authMiddleware(tokenService),
  rbacMiddleware(['Admin']),
  (req, res, next) => adminController.listVenturesOverview(req, res).catch(next)
);
app.use('/api/admin', authMiddleware(tokenService), rbacMiddleware(['Admin']), adminRouter);

app.get('/api/profile', authMiddleware(tokenService), async (req, res, next) => {
  try {
    const profile = await profileService.getProfile(req.user!.userId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    return res.json({ profile });
  } catch (e) {
    return next(e);
  }
});
app.patch('/api/profile', authMiddleware(tokenService), validate(updateProfileSchema), async (req, res, next) => {
  try {
    const profile = await profileService.updateProfile(req.user!.userId, req.body);
    await auditService.log({
      userId: req.user!.userId,
      action: 'PROFILE_EDIT',
      resourceType: 'Profile',
      resourceId: req.user!.userId,
    });
    res.json({ profile });
  } catch (e) {
    next(e);
  }
});
/** Read first non-empty string for any of the given JSON/urlencoded keys (handles proxy/body quirks). */
function firstFormString(body: unknown, keys: string[]): string {
  if (!body || typeof body !== 'object') return '';
  const o = body as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string') return v.trim();
  }
  return '';
}

// Account delete: accept JSON or urlencoded (frontend uses urlencoded for maximum reliability).
app.post('/api/account/delete', authMiddleware(tokenService), async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown> | undefined;
    const password = firstFormString(body, ['password', 'delete-password']);
    const confirmation = firstFormString(body, ['confirmation', 'delete-confirm']).toUpperCase();
    if (!password) {
      next(
        new ValidationError('Validation failed', {
          fieldErrors: { password: ['Password is required'] },
        }),
      );
      return;
    }
    if (confirmation !== 'DELETE') {
      next(
        new ValidationError('Validation failed', {
          fieldErrors: { confirmation: ['Type the word DELETE to confirm (any letter casing is ok)'] },
        }),
      );
      return;
    }
    await profileService.deleteAccount(req.user!.userId, password);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

// ─── Sectors (public list for registration/forms)
app.get('/api/sectors', async (_req, res, next) => {
  try {
    const sectors = await prisma.sector.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, description: true } });
    res.json({ sectors });
  } catch (e) {
    next(e);
  }
});

// ─── Projects (ventures for funding) — Admin/InstitutionStaff cannot create; only review via admin overview
app.get('/api/projects', authMiddleware(tokenService), (req, res, next) => {
  projectController.list(req, res).catch(next);
});
app.post(
  '/api/projects',
  authMiddleware(tokenService),
  rbacMiddleware(['Student', 'Mentor', 'OpportunityProvider']),
  validate(projectCreateSchema),
  (req, res, next) => {
    projectController.create(req, res).catch(next);
  }
);
app.get('/api/projects/:id', authMiddleware(tokenService), (req, res, next) => {
  projectController.getById(req, res).catch(next);
});
app.patch('/api/projects/:id', authMiddleware(tokenService), validate(projectUpdateSchema), (req, res, next) => {
  projectController.update(req, res).catch(next);
});
app.delete('/api/projects/:id', authMiddleware(tokenService), (req, res, next) => {
  projectController.delete(req, res).catch(next);
});

// ─── Project milestones (owner only; Students track progress)
app.get('/api/projects/:id/milestones', authMiddleware(tokenService), (req, res, next) => {
  milestoneController.list(req, res).catch(next);
});
app.post(
  '/api/projects/:id/milestones',
  authMiddleware(tokenService),
  validate(milestoneCreateSchema),
  (req, res, next) => {
    milestoneController.create(req, res).catch(next);
  }
);
app.get('/api/projects/:id/milestones/progress', authMiddleware(tokenService), (req, res, next) => {
  milestoneController.getProgress(req, res).catch(next);
});
app.get('/api/projects/:id/milestones/:milestoneId', authMiddleware(tokenService), (req, res, next) => {
  milestoneController.getById(req, res).catch(next);
});
app.patch(
  '/api/projects/:id/milestones/:milestoneId',
  authMiddleware(tokenService),
  validate(milestoneUpdateSchema),
  (req, res, next) => {
    milestoneController.update(req, res).catch(next);
  }
);
app.delete('/api/projects/:id/milestones/:milestoneId', authMiddleware(tokenService), (req, res, next) => {
  milestoneController.delete(req, res).catch(next);
});

// ─── Mentors: list by sector (any auth), profile & requests (Mentor role)
app.get('/api/mentors', authMiddleware(tokenService), (req, res, next) => {
  mentorController.listBySector(req, res).catch(next);
});
app.get('/api/mentor/profile', authMiddleware(tokenService), rbacMiddleware(['Mentor']), (req, res, next) => {
  mentorController.getMyProfile(req, res).catch(next);
});
app.patch(
  '/api/mentor/profile',
  authMiddleware(tokenService),
  rbacMiddleware(['Mentor']),
  validate(mentorProfileSchema),
  (req, res, next) => {
    mentorController.updateMyProfile(req, res).catch(next);
  }
);
// In-app notifications (all authenticated users)
app.get('/api/notifications', authMiddleware(tokenService), (req, res, next) => {
  notificationListController.getNotifications(req, res).catch(next);
});
app.patch('/api/notifications/:id/read', authMiddleware(tokenService), (req, res, next) => {
  notificationListController.markRead(req, res).catch(next);
});
app.post('/api/notifications/read-all', authMiddleware(tokenService), (req, res, next) => {
  notificationListController.markAllRead(req, res).catch(next);
});

// ─── Messaging (Student ↔ Mentor, active mentorship only)
const messagingRoles = ['Student', 'Mentor'] as const;
app.get(
  '/api/messages/eligible-peers',
  authMiddleware(tokenService),
  rbacMiddleware([...messagingRoles]),
  (req, res, next) => messagingController.listEligiblePeers(req, res).catch(next)
);
app.get(
  '/api/conversations',
  authMiddleware(tokenService),
  rbacMiddleware([...messagingRoles]),
  (req, res, next) => messagingController.listConversations(req, res).catch(next)
);
app.post(
  '/api/conversations',
  authMiddleware(tokenService),
  rbacMiddleware([...messagingRoles]),
  validate(openConversationSchema),
  (req, res, next) => messagingController.openConversation(req, res).catch(next)
);
app.get(
  '/api/conversations/:id/messages',
  authMiddleware(tokenService),
  rbacMiddleware([...messagingRoles]),
  validate(listMessagesQuerySchema),
  (req, res, next) => messagingController.listMessages(req, res).catch(next)
);
app.post(
  '/api/conversations/:id/messages',
  authMiddleware(tokenService),
  rbacMiddleware([...messagingRoles]),
  validate(sendMessageSchema),
  (req, res, next) => messagingController.sendMessage(req, res).catch(next)
);

app.get('/api/mentor/requests', authMiddleware(tokenService), rbacMiddleware(['Mentor']), (req, res, next) => {
  mentorController.listMyRequests(req, res).catch(next);
});
app.patch(
  '/api/mentor/requests/:assignmentId',
  authMiddleware(tokenService),
  rbacMiddleware(['Mentor']),
  validate(mentorRespondSchema),
  (req, res, next) => {
    mentorController.respondToRequest(req, res).catch(next);
  }
);
// Student requests mentor for a project
app.post(
  '/api/projects/:id/mentor-requests',
  authMiddleware(tokenService),
  rbacMiddleware(['Student']),
  validate(mentorRequestSchema),
  (req, res, next) => {
    mentorController.requestMentor(req, res).catch(next);
  }
);

// ─── Opportunities: list verified (all), create (OpportunityProvider), verify (Admin)
app.get('/api/opportunities', authMiddleware(tokenService), (req, res, next) => {
  opportunityController.listVerified(req, res).catch(next);
});
app.get(
  '/api/opportunities/mine',
  authMiddleware(tokenService),
  rbacMiddleware(['OpportunityProvider', 'InstitutionStaff']),
  (req, res, next) => {
    opportunityController.listMine(req, res).catch(next);
  }
);
app.get(
  '/api/opportunities/:id/applications',
  authMiddleware(tokenService),
  rbacMiddleware(['OpportunityProvider', 'InstitutionStaff']),
  (req, res, next) => {
    opportunityController.listApplications(req, res).catch(next);
  }
);
app.post(
  '/api/opportunities',
  authMiddleware(tokenService),
  rbacMiddleware(['OpportunityProvider', 'InstitutionStaff']),
  validate(opportunityCreateSchema),
  (req, res, next) => {
    opportunityController.create(req, res).catch(next);
  }
);
app.patch(
  '/api/opportunities/:id',
  authMiddleware(tokenService),
  rbacMiddleware(['OpportunityProvider', 'InstitutionStaff']),
  validate(opportunityUpdateSchema),
  (req, res, next) => {
    opportunityController.update(req, res).catch(next);
  }
);
app.get(
  '/api/provider/ventures-overview',
  authMiddleware(tokenService),
  rbacMiddleware(['OpportunityProvider', 'InstitutionStaff']),
  (req, res, next) => {
    adminController.listVenturesOverview(req, res).catch(next);
  }
);
app.get('/api/opportunities/pending', authMiddleware(tokenService), rbacMiddleware(['Admin']), (req, res, next) => {
  opportunityController.listPending(req, res).catch(next);
});
app.patch(
  '/api/opportunities/:id/verify',
  authMiddleware(tokenService),
  rbacMiddleware(['Admin']),
  validate(opportunityVerifySchema),
  (req, res, next) => {
    opportunityController.verify(req, res).catch(next);
  }
);
app.post(
  '/api/opportunities/:id/apply',
  authMiddleware(tokenService),
  rbacMiddleware(['Student']),
  validate(opportunityApplySchema),
  (req, res, next) => {
    opportunityController.apply(req, res).catch(next);
  }
);

// ─── Reporting (Admin, Institution Staff)
app.get('/api/reports/summary', authMiddleware(tokenService), rbacMiddleware(['Admin', 'InstitutionStaff']), (req, res, next) => {
  reportingController.getSummary(req, res).catch(next);
});

attachStaticFrontend(app);

app.use(errorHandler(logger));

export { app, prisma };
