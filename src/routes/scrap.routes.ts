import { Router } from 'express';
import { scrapController } from '../controllers/scrap.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { optionalAuth } from '../middleware/auth.middleware';
import { analyzeScrapSchema } from '../validators/scrap.schemas';

const router = Router();

router.get('/rates', scrapController.getCategoryPrices);
router.get('/popular', scrapController.getPopularItems);
router.post('/analyze', optionalAuth, validateRequest({ body: analyzeScrapSchema }), scrapController.analyzeScrap);

export default router;
