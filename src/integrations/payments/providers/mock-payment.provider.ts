import {
  PaymentProvider,
  CreateOrderParams,
  PaymentOrderResult,
  VerifyPaymentParams,
  PaymentVerificationResult,
} from '../payment.interface';

export class MockPaymentProvider implements PaymentProvider {
  async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
    return {
      orderId: `order_mock_${Date.now()}`,
      amount: params.amount,
      currency: 'INR',
      keyId: 'rzp_test_mockKey123',
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult> {
    return {
      isVerified: true,
      transactionId: params.paymentId || `TXN${Date.now()}`,
      amount: 0, // Enriched by service from authoritative record
      method: params.method || 'UPI / GPay Direct',
      timestamp: new Date().toISOString(),
    };
  }
}
