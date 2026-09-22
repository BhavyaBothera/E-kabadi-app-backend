import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/citizens', adminController.getCitizens);
router.patch('/citizens/:id/coins', adminController.modifyCitizenCoins);
router.get('/collectors', adminController.getCollectors);
router.patch('/collectors/:id/status', adminController.toggleCollectorStatus);
router.patch('/pickups/:id/reassign', adminController.reassignPickup);
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
