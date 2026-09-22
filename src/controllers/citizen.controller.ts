import { Request, Response, NextFunction } from 'express';
import { citizenService } from '../services/citizen.service';
import { ApiResponse } from '../utils/api-response';

export class CitizenController {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const citizenId = req.user!.id;
      const dashboard = await citizenService.getDashboard(citizenId);
      ApiResponse.success(res, dashboard, 'Citizen dashboard retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const citizenId = req.user!.id;
      const profile = await citizenService.updateProfile(citizenId, req.body);
      ApiResponse.success(res, profile, 'Citizen profile updated');
    } catch (error) {
      next(error);
    }
  }

  async getAddresses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const citizenId = req.user!.id;
      const addresses = await citizenService.getAddresses(citizenId);
      ApiResponse.success(res, addresses, 'Addresses retrieved');
    } catch (error) {
      next(error);
    }
  }

  async addAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const citizenId = req.user!.id;
      const address = await citizenService.addAddress(citizenId, req.body);
      ApiResponse.created(res, address, 'Address added successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const citizenController = new CitizenController();
