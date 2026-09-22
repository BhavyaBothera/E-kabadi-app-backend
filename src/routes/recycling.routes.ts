import { Router } from 'express';
import { recyclingController } from '../controllers/recycling.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/:id', recyclingController.getJourney);
router.get('/pickup/:pickupId', recyclingController.getJourneyByPickup);

export default router;
