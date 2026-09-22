import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { createPaymentOrderSchema, verifyPaymentSchema } from '../validators/payment.schemas';

const router = Router();

router.use(requireAuth);

router.post('/create', validateRequest({ body: createPaymentOrderSchema }), paymentController.createOrder);
router.post('/verify', validateRequest({ body: verifyPaymentSchema }), paymentController.verifyPayment);
router.get('/', paymentController.getHistory);

export default router;
