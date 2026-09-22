import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rate-limit.middleware';
import {
  registerSchema,
  loginPhoneSchema,
  verifyOtpSchema,
  selectRoleSchema,
} from '../validators/auth.schemas';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: registerSchema }),
  authController.register,
);

router.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginPhoneSchema }),
  authController.login,
);

router.post(
  '/verify-otp',
  authRateLimiter,
  validateRequest({ body: verifyOtpSchema }),
  authController.verifyOtp,
);

router.post(
  '/role',
  requireAuth,
  validateRequest({ body: selectRoleSchema }),
  authController.selectRole,
);

export default router;
