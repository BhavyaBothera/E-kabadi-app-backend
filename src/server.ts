import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const server = app.listen(env.PORT, () => {
  logger.info(`♻️ E-Kabadi Backend running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  logger.info(`Health check available at: http://localhost:${env.PORT}/api/v1/health`);
});

const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, closing HTTP server gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
