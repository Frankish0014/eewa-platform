/**
 * Express app bootstrap — routes, middleware, DI wiring.
 */
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './common/logger';
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
  opportunityVerifySchema,
} from './features/opportunities';
import { createReportingService, createReportingController } from './features/reporting';
import { createAuditService } from './features/audit';
import { createAdminController } from './features/admin';

const prisma = new PrismaClient();
const tokenService = createTokenService();
const authRepo = createAuthRepository(prisma);
const authService = createAuthService(authRepo, tokenService, createAuditService(prisma));
const authController = createAuthController(authService);
const profileService = createProfileService(prisma);
const projectRepo = createProjectRepository(prisma);
const projectService = createProjectService(projectRepo);
const projectController = createProjectController(projectService, createAuditService(prisma));
const milestoneRepo = createMilestoneRepository(prisma);
const milestoneService = createMilestoneService(milestoneRepo);
const milestoneController = createMilestoneController(milestoneService);
const mentorRepo = createMentorRepository(prisma);
const mentorService = createMentorService(mentorRepo);
const mentorController = createMentorController(mentorService, createAuditService(prisma));
const opportunityRepo = createOpportunityRepository(prisma);
const opportunityService = createOpportunityService(opportunityRepo);
const opportunityController = createOpportunityController(opportunityService, createAuditService(prisma));
const reportingService = createReportingService(prisma);
const reportingController = createReportingController(reportingService);
const adminController = createAdminController(prisma);

const app = express();

app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json());
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
    res.json({ profile });
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
app.get('/api/opportunities/mine', authMiddleware(tokenService), rbacMiddleware(['OpportunityProvider']), (req, res, next) => {
  opportunityController.listMine(req, res).catch(next);
});
app.post(
  '/api/opportunities',
  authMiddleware(tokenService),
  rbacMiddleware(['OpportunityProvider']),
  validate(opportunityCreateSchema),
  (req, res, next) => {
    opportunityController.create(req, res).catch(next);
  }
);
app.get('/api/provider/ventures-overview', authMiddleware(tokenService), rbacMiddleware(['OpportunityProvider']), (req, res, next) => {
  adminController.listVenturesOverview(req, res).catch(next);
});
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

// ─── Reporting (Admin, Institution Staff)
app.get('/api/reports/summary', authMiddleware(tokenService), rbacMiddleware(['Admin', 'InstitutionStaff']), (req, res, next) => {
  reportingController.getSummary(req, res).catch(next);
});

app.use(errorHandler(logger));

export { app, prisma };
