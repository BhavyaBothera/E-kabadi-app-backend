import { Request, Response, NextFunction } from 'express';
import { rewardService } from '../services/reward.service';
import { ApiResponse } from '../utils/api-response';

export class RewardController {
  async getCitizenPoints(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const citizenId = req.user!.id;
      const history = await rewardService.getCitizenPointHistory(citizenId);
      ApiResponse.success(res, history, 'Citizen Eco Points history retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getCollectorCoins(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const collectorId = req.user!.id;
      const history = await rewardService.getCollectorCoinHistory(collectorId);
      ApiResponse.success(res, history, 'Collector Eco Coins history retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getCatalog(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const catalog = await rewardService.getRewardCatalog();
      ApiResponse.success(res, catalog, 'Reward catalog retrieved');
    } catch (error) {
      next(error);
    }
  }

  async redeemCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const coupon = await rewardService.redeemCoupon(userId, req.body.catalogId);
      ApiResponse.success(res, coupon, 'Reward coupon redeemed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const rewardController = new RewardController();
