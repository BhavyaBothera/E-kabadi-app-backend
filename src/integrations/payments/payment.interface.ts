export interface CreateOrderParams {
  pickupId: string;
  amount: number; // in INR
  citizenId: string;
}

export interface PaymentOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId?: string;
}

export interface VerifyPaymentParams {
  pickupId: string;
  orderId: string;
  paymentId: string;
  signature?: string;
  method?: string;
}

export interface PaymentVerificationResult {
  isVerified: boolean;
  transactionId: string;
  amount: number;
  method: string;
  timestamp: string;
}

export interface PaymentProvider {
  createOrder(params: CreateOrderParams): Promise<PaymentOrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult>;
}
