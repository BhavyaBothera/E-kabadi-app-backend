import { Router } from 'express';
import { storageController } from '../controllers/storage.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Both authenticated endpoints
router.get('/image', requireAuth, storageController.getImageUrl);
router.post('/upload', requireAuth, storageController.uploadImage);

export default router;
