/**
 * Express app bootstrap — routes, middleware, DI wiring.
 */
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './common/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
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

const prisma = new PrismaClient();
const tokenService = createTokenService();
const authRepo = createAuthRepository(prisma);
const authService = createAuthService(authRepo, tokenService);
const authController = createAuthController(authService);
const profileService = createProfileService(prisma);
const projectRepo = createProjectRepository(prisma);
const projectService = createProjectService(projectRepo);
const projectController = createProjectController(projectService);

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

// ─── Projects (ventures for funding)
app.get('/api/projects', authMiddleware(tokenService), (req, res, next) => {
  projectController.list(req, res).catch(next);
});
app.post('/api/projects', authMiddleware(tokenService), validate(projectCreateSchema), (req, res, next) => {
  projectController.create(req, res).catch(next);
});
app.get('/api/projects/:id', authMiddleware(tokenService), (req, res, next) => {
  projectController.getById(req, res).catch(next);
});
app.patch('/api/projects/:id', authMiddleware(tokenService), validate(projectUpdateSchema), (req, res, next) => {
  projectController.update(req, res).catch(next);
});
app.delete('/api/projects/:id', authMiddleware(tokenService), (req, res, next) => {
  projectController.delete(req, res).catch(next);
});

app.use(errorHandler(logger));

export { app, prisma };
