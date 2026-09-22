import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { env } from './config/env';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { globalRateLimiter } from './middleware/rate-limit.middleware';
import { errorHandler } from './middleware/error.middleware';
import { ApiResponse } from './utils/api-response';

// Route imports
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import citizensRoutes from './routes/citizens.routes';
import collectorsRoutes from './routes/collectors.routes';
import scrapRoutes from './routes/scrap.routes';
import pickupsRoutes from './routes/pickups.routes';
import paymentsRoutes from './routes/payments.routes';
import rewardsRoutes from './routes/rewards.routes';
import recyclingRoutes from './routes/recycling.routes';
import notificationsRoutes from './routes/notifications.routes';
import impactRoutes from './routes/impact.routes';
import adminRoutes from './routes/admin.routes';

const app: Express = express();

// Security & Core Middleware
app.use(helmet());
app.use(
  cors({
    origin: env.NODE_ENV === 'production' ? env.FRONTEND_ORIGIN : true,
    credentials: true,
  }),
);

app.use(express.json({ limit: '15mb' })); // Support base64 image uploads for scrap AI
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(requestIdMiddleware);

if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

app.use(globalRateLimiter);

// API Routes Mounting
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/citizens', citizensRoutes);
app.use('/api/v1/collectors', collectorsRoutes);
app.use('/api/v1/scrap', scrapRoutes);
app.use('/api/v1/pickups', pickupsRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/rewards', rewardsRoutes);
app.use('/api/v1/recycling', recyclingRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/impact', impactRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  ApiResponse.error(res, `Cannot ${req.method} ${req.path}`, 404, 'ROUTE_NOT_FOUND');
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
