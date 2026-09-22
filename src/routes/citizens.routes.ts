import { Router } from 'express';
import { citizenController } from '../controllers/citizen.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { updateCitizenProfileSchema, createAddressSchema } from '../validators/citizen.schemas';

const router = Router();

router.use(requireAuth);
router.use(requireRole('citizen', 'admin'));

router.get('/dashboard', citizenController.getDashboard);
router.patch('/profile', validateRequest({ body: updateCitizenProfileSchema }), citizenController.updateProfile);
router.get('/addresses', citizenController.getAddresses);
router.post('/addresses', validateRequest({ body: createAddressSchema }), citizenController.addAddress);

export default router;
