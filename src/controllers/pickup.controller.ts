import { Request, Response, NextFunction } from 'express';
import { pickupService } from '../services/pickup.service';
import { ApiResponse } from '../utils/api-response';

export class PickupController {
  async createPickup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const citizenId = req.user!.id;
      const pickup = await pickupService.createPickup(citizenId, req.body);
      ApiResponse.created(res, pickup, 'Pickup request created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getPickups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      let pickups;
      if (user.role === 'collector') {
        pickups = await pickupService.getCollectorPickups(user.id);
      } else {
        pickups = await pickupService.getCitizenPickups(user.id);
      }
      ApiResponse.success(res, pickups, 'Pickups retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getPickupById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pickup = await pickupService.getPickupById(req.params.id as string);
      ApiResponse.success(res, pickup, 'Pickup details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const pickup = await pickupService.updateStatus(req.params.id as string, req.body, userId);
      ApiResponse.success(res, pickup, 'Pickup status updated');
    } catch (error) {
      next(error);
    }
  }

  async verifyPickup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const pickup = await pickupService.verifyPickup(req.params.id as string, req.body, userId);
      ApiResponse.success(res, pickup, 'Pickup scrap verified successfully');
    } catch (error) {
      next(error);
    }
  }

  async cancelPickup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const pickup = await pickupService.cancelPickup(req.params.id as string, req.body, userId);
      ApiResponse.success(res, pickup, 'Pickup cancelled');
    } catch (error) {
      next(error);
    }
  }
}

export const pickupController = new PickupController();
