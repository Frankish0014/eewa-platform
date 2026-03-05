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
  refreshSchema,
} from './features/auth';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const tokenService = createTokenService();
const authRepo = createAuthRepository(prisma);
const authService = createAuthService(authRepo, tokenService);
const authController = createAuthController(authService);

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
app.post('/api/auth/login', validate(loginSchema), (req, res, next) => {
  authController.login(req, res).catch(next);
});
app.post('/api/auth/refresh', validate(refreshSchema), (req, res, next) => {
  authController.refresh(req, res).catch(next);
});

// ─── Protected route example (requires JWT)
app.get('/api/me', authMiddleware(tokenService), (req, res) => {
  res.json({ user: req.user });
});

app.use(errorHandler(logger));

export { app, prisma };
