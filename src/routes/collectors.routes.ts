import { Router } from 'express';
import { collectorController } from '../controllers/collector.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  updateCollectorStatusSchema,
  updateCollectorLocationSchema,
  nearbyCollectorsQuerySchema,
} from '../validators/collector.schemas';

const router = Router();

// Public / Citizen route to view nearby collectors
router.get(
  '/nearby',
  validateRequest({ query: nearbyCollectorsQuerySchema }),
  collectorController.getNearbyCollectors,
);

// Collector-only routes
router.patch(
  '/status',
  requireAuth,
  requireRole('collector', 'admin'),
  validateRequest({ body: updateCollectorStatusSchema }),
  collectorController.updateStatus,
);

router.patch(
  '/location',
  requireAuth,
  requireRole('collector', 'admin'),
  validateRequest({ body: updateCollectorLocationSchema }),
  collectorController.updateLocation,
);

router.get(
  '/earnings',
  requireAuth,
  requireRole('collector', 'admin'),
  collectorController.getEarnings,
);

export default router;
