import { Router } from 'express';
import { rewardController } from '../controllers/reward.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { redeemCouponSchema } from '../validators/reward.schemas';

const router = Router();

router.use(requireAuth);

router.get('/points', rewardController.getCitizenPoints);
router.get('/coins', rewardController.getCollectorCoins);
router.get('/coupons', rewardController.getCatalog);
router.post('/redeem', validateRequest({ body: redeemCouponSchema }), rewardController.redeemCoupon);

export default router;
