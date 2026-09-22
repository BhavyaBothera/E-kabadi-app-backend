import { Request, Response, NextFunction } from 'express';
import { impactService } from '../services/impact.service';
import { ApiResponse } from '../utils/api-response';

export class ImpactController {
  async getSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await impactService.getImpactSummary();
      ApiResponse.success(res, summary, 'Environmental impact metrics retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const impactController = new ImpactController();
