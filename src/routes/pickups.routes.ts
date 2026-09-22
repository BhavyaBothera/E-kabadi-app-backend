import { Router } from 'express';
import { pickupController } from '../controllers/pickup.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createPickupSchema,
  updatePickupStatusSchema,
  verifyPickupSchema,
  cancelPickupSchema,
} from '../validators/pickup.schemas';

const router = Router();

router.use(requireAuth);

router.post('/', validateRequest({ body: createPickupSchema }), pickupController.createPickup);
router.get('/', pickupController.getPickups);
router.get('/:id', pickupController.getPickupById);
router.patch('/:id/status', validateRequest({ body: updatePickupStatusSchema }), pickupController.updateStatus);
router.post('/:id/verify', validateRequest({ body: verifyPickupSchema }), pickupController.verifyPickup);
router.post('/:id/cancel', validateRequest({ body: cancelPickupSchema }), pickupController.cancelPickup);

export default router;
