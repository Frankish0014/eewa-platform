/**
 * HTTP server entry — listens on PORT.
 */
import { config } from './config';
import { app, prisma } from './app';
import { logger } from './common/logger';

const server = app.listen(config.PORT, () => {
  logger.info(`EEWA API listening on port ${config.PORT}`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
