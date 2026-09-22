import { Request, Response, NextFunction } from 'express';
import { recyclingService } from '../services/recycling.service';
import { ApiResponse } from '../utils/api-response';

export class RecyclingController {
  async getJourney(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const journey = await recyclingService.getJourneyById(req.params.id as string);
      ApiResponse.success(res, journey, 'Recycling journey retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getJourneyByPickup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const journey = await recyclingService.getJourneyByPickupId(req.params.pickupId as string);
      ApiResponse.success(res, journey, 'Recycling journey retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const recyclingController = new RecyclingController();
