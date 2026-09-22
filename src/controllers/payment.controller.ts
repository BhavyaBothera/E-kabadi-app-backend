import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { ApiResponse } from '../utils/api-response';

export class PaymentController {
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const citizenId = req.user!.id;
      const order = await paymentService.createOrder(req.body.pickupId, citizenId);
      ApiResponse.created(res, order, 'Payment order created');
    } catch (error) {
      next(error);
    }
  }

  async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await paymentService.verifyPayment(req.body);
      ApiResponse.success(res, payment, 'Payment verified and recorded');
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const history = await paymentService.getPaymentHistory(userId);
      ApiResponse.success(res, history, 'Payment history retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
