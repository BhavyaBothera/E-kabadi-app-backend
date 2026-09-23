import { PaymentProvider } from '../integrations/payments/payment.interface';
import { MockPaymentProvider } from '../integrations/payments/providers/mock-payment.provider';
import { RazorpayProvider } from '../integrations/payments/providers/razorpay.provider';
import { env, isMockStore } from '../config/env';
import { supabaseAdmin } from '../config/supabase';
import { inMemoryStore } from '../db/in-memory-store';
import { pickupService } from './pickup.service';
import { rewardService } from './reward.service';
import { BadRequestError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface PaymentModelResponse {
  id: string;
  pickupId: string;
  amount: number;
  method: string;
  status: string;
  transactionId: string;
  timestamp: string;
  ecoPointsEarned: number;
}

export class PaymentService {
  private provider: PaymentProvider;

  constructor() {
    if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
      logger.info('Using RazorpayProvider for payments');
      this.provider = new RazorpayProvider(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET);
    } else {
      logger.info('Using MockPaymentProvider for payments');
      this.provider = new MockPaymentProvider();
    }
  }

  async createOrder(pickupId: string, citizenId: string) {
    const pickup = await pickupService.getPickupById(pickupId);

    if (pickup.status !== 'verified' && pickup.status !== 'arrived') {
      throw new BadRequestError(
        `Cannot initiate payment for pickup in '${pickup.status}' status. Must be verified.`,
        'INVALID_STATUS_FOR_PAYMENT',
      );
    }

    // Authoritative amount from verified bill or total estimate
    const authoritativeAmount = pickup.finalVerifiedPrice > 0 ? pickup.finalVerifiedPrice : pickup.totalEstimatedPrice;

    const order = await this.provider.createOrder({
      pickupId,
      amount: authoritativeAmount,
      citizenId,
    });

    return {
      ...order,
      pickupId,
      amount: authoritativeAmount,
    };
  }

  async verifyPayment(params: {
    pickupId: string;
    orderId: string;
    paymentId: string;
    signature?: string;
    method?: string;
    idempotencyKey?: string;
  }): Promise<PaymentModelResponse> {
    const pickup = await pickupService.getPickupById(params.pickupId);
    const authoritativeAmount = pickup.finalVerifiedPrice > 0 ? pickup.finalVerifiedPrice : pickup.totalEstimatedPrice;

    const isMock = isMockStore();

    // 1. Idempotency Check
    if (isMock) {
      if (inMemoryStore.payments.has(params.pickupId)) {
        return inMemoryStore.payments.get(params.pickupId);
      }
    } else {
      const { data: existingPayment } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('pickup_id', params.pickupId)
        .maybeSingle();

      if (existingPayment) {
        return {
          id: existingPayment.id,
          pickupId: existingPayment.pickup_id,
          amount: parseFloat(existingPayment.amount),
          method: existingPayment.method,
          status: existingPayment.status,
          transactionId: existingPayment.transaction_id,
          timestamp: existingPayment.created_at,
          ecoPointsEarned: existingPayment.eco_points_earned,
        };
      }
    }

    // 2. Gateway Verification
    const verification = await this.provider.verifyPayment({
      pickupId: params.pickupId,
      orderId: params.orderId,
      paymentId: params.paymentId,
      signature: params.signature,
      method: params.method,
    });

    if (!verification.isVerified) {
      throw new BadRequestError('Payment signature or verification failed', 'PAYMENT_VERIFICATION_FAILED');
    }

    // 3. Mark Pickup Completed
    await pickupService.updateStatus(
      params.pickupId,
      { status: 'completed', notes: 'Payment completed successfully' },
      pickup.collectorId,
    );

    // 4. Award Eco Points & Eco Coins via Reward Ledger
    const rewards = await rewardService.awardPointsForPickup(
      pickup.citizenId,
      pickup.collectorId,
      params.pickupId,
      authoritativeAmount,
    );

    const paymentId = `PAY-${Math.floor(100 + Math.random() * 900)}`;
    const paymentRecord: PaymentModelResponse = {
      id: paymentId,
      pickupId: params.pickupId,
      amount: authoritativeAmount,
      method: params.method || 'UPI / GPay Direct',
      status: 'SUCCESS',
      transactionId: verification.transactionId,
      timestamp: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ecoPointsEarned: rewards.citizenPoints,
    };

    // 5. Store Payment Record
    if (isMock) {
      inMemoryStore.payments.set(params.pickupId, paymentRecord);
    } else {
      let collectorId = pickup.collectorId;
      if (!collectorId) {
        const { data: col } = await supabaseAdmin
          .from('collector_profiles')
          .select('user_id')
          .limit(1)
          .maybeSingle();
        if (col?.user_id) collectorId = col.user_id;
      }

      await supabaseAdmin.from('payments').insert({
        id: paymentId,
        pickup_id: params.pickupId,
        citizen_id: pickup.citizenId,
        collector_id: collectorId,
        amount: authoritativeAmount,
        method: paymentRecord.method,
        status: 'SUCCESS',
        transaction_id: paymentRecord.transactionId,
        idempotency_key: params.idempotencyKey || `${params.pickupId}_${Date.now()}`,
        eco_points_earned: rewards.citizenPoints,
      });
    }

    return paymentRecord;
  }

  async getPaymentHistory(userId: string): Promise<PaymentModelResponse[]> {
    if (isMockStore()) {
      const records = Array.from(inMemoryStore.payments.values());
      if (records.length === 0) {
        return [
          {
            id: 'PAY-901',
            pickupId: 'PK-8320',
            amount: 850.0,
            method: 'UPI (Google Pay)',
            status: 'SUCCESS',
            transactionId: 'TXN948102948',
            timestamp: '15 Sep 2026, 02:45 PM',
            ecoPointsEarned: 85,
          },
          {
            id: 'PAY-890',
            pickupId: 'PK-7210',
            amount: 430.0,
            method: 'UPI (PhonePe)',
            status: 'SUCCESS',
            transactionId: 'TXN823901823',
            timestamp: '08 Sep 2026, 11:20 AM',
            ecoPointsEarned: 0,
          },
        ];
      }
      return records;
    }

    const { data } = await supabaseAdmin
      .from('payments')
      .select('*')
      .or(`citizen_id.eq.${userId},collector_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    return (data || []).map((p) => ({
      id: p.id,
      pickupId: p.pickup_id,
      amount: parseFloat(p.amount),
      method: p.method,
      status: p.status,
      transactionId: p.transaction_id,
      timestamp: p.created_at,
      ecoPointsEarned: p.eco_points_earned,
    }));
  }
}

export const paymentService = new PaymentService();
