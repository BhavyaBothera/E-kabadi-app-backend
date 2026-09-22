import { Request, Response, NextFunction } from 'express';
import { collectorService } from '../services/collector.service';
import { ApiResponse } from '../utils/api-response';

export class CollectorController {
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const collectorId = req.user!.id;
      const earnings = await collectorService.updateStatus(collectorId, req.body);
      ApiResponse.success(res, earnings, 'Status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const collectorId = req.user!.id;
      const location = await collectorService.updateLocation(collectorId, req.body);
      ApiResponse.success(res, location, 'Location updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getEarnings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const collectorId = req.user!.id;
      const earnings = await collectorService.getEarnings(collectorId);
      ApiResponse.success(res, earnings, 'Collector earnings retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getNearbyCollectors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const collectors = await collectorService.getNearbyCollectors(
        req.query as unknown as import('../validators/collector.schemas').NearbyCollectorsQueryInput,
      );
      ApiResponse.success(res, collectors, 'Nearby collectors retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const collectorController = new CollectorController();
