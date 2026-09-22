import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { ApiResponse } from '../utils/api-response';

export class NotificationController {
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const notifications = await notificationService.getNotifications(userId);
      ApiResponse.success(res, notifications, 'Notifications retrieved');
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      await notificationService.markAsRead(req.params.id as string, userId);
      ApiResponse.success(res, { read: true }, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
