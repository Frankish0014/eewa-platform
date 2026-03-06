/**
 * HTTP server entry — listens on PORT.
 */
import 'dotenv/config';
import { config } from './config';
import { app, prisma } from './app';
import { logger } from './common/logger';

async function start() {
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (e) {
    logger.error('Database connection failed', {
      message: e instanceof Error ? e.message : String(e),
    });
    process.exit(1);
  }

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
}

start();
