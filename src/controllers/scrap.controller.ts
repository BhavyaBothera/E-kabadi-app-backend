import { Request, Response, NextFunction } from 'express';
import { scrapService } from '../services/scrap.service';
import { ApiResponse } from '../utils/api-response';

export class ScrapController {
  async getCategoryPrices(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const prices = await scrapService.getCategoryPrices();
      ApiResponse.success(res, prices, 'Scrap category prices retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getPopularItems(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = await scrapService.getPopularItems();
      ApiResponse.success(res, items, 'Popular scrap items retrieved');
    } catch (error) {
      next(error);
    }
  }

  async analyzeScrap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const items = await scrapService.analyzeScrap(req.body, userId);
      ApiResponse.success(res, items, 'Scrap analyzed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const scrapController = new ScrapController();
