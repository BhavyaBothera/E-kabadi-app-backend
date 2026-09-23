import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { storageService } from './services/storage.service';

const server = app.listen(env.PORT, '0.0.0.0', async () => {
  logger.info(`♻️ E-Kabadi Backend running on 0.0.0.0:${env.PORT} in ${env.NODE_ENV} mode`);
  logger.info(`Health check available at: http://localhost:${env.PORT}/api/v1/health`);

  // Ensure Supabase Storage bucket is provisioned
  await storageService.ensureBucket();
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
