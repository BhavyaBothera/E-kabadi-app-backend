import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { ApiResponse } from '../utils/api-response';

export class AdminController {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getDashboard();
      ApiResponse.success(res, data, 'Admin dashboard metrics retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getCitizens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getCitizens();
      ApiResponse.success(res, data, 'Citizens list retrieved');
    } catch (error) {
      next(error);
    }
  }

  async modifyCitizenCoins(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { amount, action } = req.body;
      const result = await adminService.modifyCitizenCoins(id, Number(amount), action);
      ApiResponse.success(res, result, `Successfully ${action === 'add' ? 'added' : 'deducted'} citizen coins`);
    } catch (error) {
      next(error);
    }
  }

  async getCollectors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getCollectors();
      ApiResponse.success(res, data, 'Collectors list retrieved');
    } catch (error) {
      next(error);
    }
  }

  async toggleCollectorStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await adminService.toggleCollectorStatus(id);
      ApiResponse.success(res, result, 'Collector status toggled');
    } catch (error) {
      next(error);
    }
  }

  async reassignPickup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { collectorId } = req.body;
      const result = await adminService.reassignPickup(id, collectorId, req.user!.id);
      ApiResponse.success(res, result, 'Pickup reassigned successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getAuditLogs();
      ApiResponse.success(res, data, 'Audit logs retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
