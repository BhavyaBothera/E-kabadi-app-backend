import crypto from 'crypto';
import {
  PaymentProvider,
  CreateOrderParams,
  PaymentOrderResult,
  VerifyPaymentParams,
  PaymentVerificationResult,
} from '../payment.interface';
import { BadRequestError } from '../../../utils/errors';
import { logger } from '../../../utils/logger';

export class RazorpayProvider implements PaymentProvider {
  private keyId: string;
  private keySecret: string;

  constructor(keyId: string, keySecret: string) {
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
    try {
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          amount: Math.round(params.amount * 100), // in paise
          currency: 'INR',
          receipt: params.pickupId,
          notes: { citizenId: params.citizenId },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Razorpay order creation failed: HTTP ${response.status} - ${errorText}`);
        throw new Error(`Razorpay create order failed: ${response.status} - ${errorText}`);
      }

      const order = (await response.json()) as { id: string; amount: number; currency: string };
      logger.info(`[RazorpayProvider] Order created: ${order.id} for amount ₹${order.amount / 100}`);
      return {
        orderId: order.id,
        amount: order.amount / 100,
        currency: order.currency,
        keyId: this.keyId,
      };
    } catch (err) {
      logger.error('Razorpay order creation error:', err);
      throw new BadRequestError('Failed to create Razorpay payment order');
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult> {
    if (!params.signature) {
      throw new BadRequestError('Missing Razorpay payment signature', 'PAYMENT_SIGNATURE_REQUIRED');
    }

    const body = `${params.orderId}|${params.paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== params.signature) {
      logger.warn('Razorpay signature mismatch');
      throw new BadRequestError('Invalid payment signature', 'INVALID_PAYMENT_SIGNATURE');
    }

    return {
      isVerified: true,
      transactionId: params.paymentId,
      amount: 0,
      method: params.method || 'Razorpay / UPI',
      timestamp: new Date().toISOString(),
    };
  }
}
