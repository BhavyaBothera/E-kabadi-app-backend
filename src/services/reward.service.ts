import { supabaseAdmin } from '../config/supabase';
import { env, isMockStore } from '../config/env';
import { inMemoryStore } from '../db/in-memory-store';
import { APP_CONSTANTS } from '../config/constants';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface EcoPointHistoryItem {
  id: string;
  points: number;
  type: string; // 'earned', 'redeemed'
  title: string;
  description: string;
  timestamp: string;
}

export interface EcoCoinHistoryItem {
  id: string;
  coins: number;
  title: string;
  description: string;
  category: string;
  isCredit: boolean;
  timestamp: string;
}

export interface RewardCouponItem {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  partnerName: string;
  couponCode: string;
  expiryDate: string;
}

export class RewardService {
  /**
   * Citizen Rule:
   * Earned ONLY when the FINAL VERIFIED bill is ₹500 or more (10% of bill).
   * Below ₹500 yields 0 points.
   */
  calculateCitizenEcoPoints(finalVerifiedBill: number): number {
    if (finalVerifiedBill < APP_CONSTANTS.CITIZEN_MIN_BILL_FOR_POINTS) {
      return 0;
    }
    return Math.floor(finalVerifiedBill * APP_CONSTANTS.REWARD_RATE);
  }

  /**
   * Collector Rule:
   * Earned on EVERY completed transaction (10% of transaction amount, no ₹500 threshold).
   */
  calculateCollectorEcoCoins(transactionAmount: number): number {
    if (transactionAmount <= 0) return 0;
    return Math.floor(transactionAmount * APP_CONSTANTS.REWARD_RATE);
  }

  async awardPointsForPickup(
    citizenId: string,
    collectorId: string,
    pickupId: string,
    finalAmount: number,
  ): Promise<{ citizenPoints: number; collectorCoins: number }> {
    const citizenPoints = this.calculateCitizenEcoPoints(finalAmount);
    const collectorCoins = this.calculateCollectorEcoCoins(finalAmount);

    const isMock = isMockStore();

    // 1. Citizen Points Ledger Entry
    if (citizenPoints > 0) {
      if (isMock) {
        const c = inMemoryStore.citizenProfiles.get(citizenId) || { ecoPoints: 840, totalSoldKg: 0, totalEarned: 0 };
        c.ecoPoints += citizenPoints;
        inMemoryStore.citizenProfiles.set(citizenId, c);
        inMemoryStore.rewardTransactions.push({
          id: `PT-${Date.now()}`,
          user_id: citizenId,
          role: 'citizen',
          type: 'earned',
          amount: citizenPoints,
          source: 'pickup_payment',
          reference_id: pickupId,
          title: 'Pickup Completed',
          description: `Final verified bill ₹${finalAmount} • 10% Eco Points`,
          timestamp: 'Just now',
        });
      } else {
        await supabaseAdmin.from('reward_transactions').insert({
          user_id: citizenId,
          role: 'citizen',
          type: 'earned',
          amount: citizenPoints,
          source: 'pickup_payment',
          reference_id: pickupId,
          title: 'Pickup Completed',
          description: `Final verified bill ₹${finalAmount} • 10% Eco Points`,
        });

        // Update cached balance
        const { data } = await supabaseAdmin
          .from('citizen_profiles')
          .select('eco_points_balance')
          .eq('user_id', citizenId)
          .maybeSingle();
        const current = data?.eco_points_balance || 0;
        await supabaseAdmin
          .from('citizen_profiles')
          .update({ eco_points_balance: current + citizenPoints })
          .eq('user_id', citizenId);
      }
    }

    // 2. Collector Coins Ledger Entry
    if (collectorCoins > 0) {
      if (isMock) {
        const col = inMemoryStore.collectorProfiles.get(collectorId) || {
          isAvailable: true,
          currentStatus: 'Active',
          vehicleNumber: '',
          vehicleType: '',
          serviceArea: '',
          currentLat: 0,
          currentLon: 0,
          ecoCoins: 1250,
          todayEarnings: 0,
          todayPickups: 0,
          todayWeight: 0,
        };
        col.ecoCoins += collectorCoins;
        inMemoryStore.collectorProfiles.set(collectorId, col);
        inMemoryStore.rewardTransactions.push({
          id: `CN-${Date.now()}`,
          user_id: collectorId,
          role: 'collector',
          type: 'earned',
          amount: collectorCoins,
          source: 'pickup_payment',
          reference_id: pickupId,
          title: 'Pickup Completed',
          description: `Final transaction ₹${finalAmount} • 10% Eco Coins`,
          category: 'Transaction',
          isCredit: true,
          timestamp: 'Just now',
        });
      } else {
        await supabaseAdmin.from('reward_transactions').insert({
          user_id: collectorId,
          role: 'collector',
          type: 'earned',
          amount: collectorCoins,
          source: 'pickup_payment',
          reference_id: pickupId,
          title: 'Pickup Completed',
          description: `Final transaction ₹${finalAmount} • 10% Eco Coins`,
          category: 'Transaction',
        });

        const { data } = await supabaseAdmin
          .from('collector_profiles')
          .select('eco_coins_balance')
          .eq('user_id', collectorId)
          .single();
        const current = data?.eco_coins_balance || 0;
        await supabaseAdmin
          .from('collector_profiles')
          .update({ eco_coins_balance: current + collectorCoins })
          .eq('user_id', collectorId);
      }
    }

    logger.info(`Awarded ${citizenPoints} points to citizen and ${collectorCoins} coins to collector for pickup ${pickupId}`);
    return { citizenPoints, collectorCoins };
  }

  async getCitizenPointHistory(citizenId: string): Promise<EcoPointHistoryItem[]> {
    if (isMockStore()) {
      const txs = inMemoryStore.rewardTransactions.filter(
        (t) => t.user_id === citizenId || t.role === 'citizen',
      );
      if (txs.length === 0) {
        return [
          {
            id: 'PT-101',
            points: 120,
            type: 'earned',
            title: 'Pickup Completed',
            description: 'Final verified bill ₹1,200 • 10% Eco Points',
            timestamp: '18 Sep 2026',
          },
          {
            id: 'PT-102',
            points: 0,
            type: 'earned',
            title: 'Pickup Completed',
            description: 'Final verified bill ₹430 • Below ₹500 — no Eco Points',
            timestamp: '15 Sep 2026',
          },
          {
            id: 'PT-103',
            points: 100,
            type: 'redeemed',
            title: '₹50 Groceries Voucher',
            description: 'Redeemed at SuperEco Market',
            timestamp: '10 Sep 2026',
          },
        ];
      }
      return txs.map((t) => ({
        id: t.id,
        points: t.amount,
        type: t.type,
        title: t.title,
        description: t.description,
        timestamp: t.timestamp || 'Today',
      }));
    }

    const { data } = await supabaseAdmin
      .from('reward_transactions')
      .select('*')
      .eq('user_id', citizenId)
      .eq('role', 'citizen')
      .order('created_at', { ascending: false });

    return (data || []).map((t) => ({
      id: t.id,
      points: t.amount,
      type: t.type,
      title: t.title,
      description: t.description,
      timestamp: t.created_at,
    }));
  }

  async getCollectorCoinHistory(collectorId: string): Promise<EcoCoinHistoryItem[]> {
    if (isMockStore()) {
      return [
        {
          id: 'CN-201',
          coins: 45,
          title: 'Pickup Completed',
          description: 'Final transaction ₹450 • 10% Eco Coins',
          category: 'Transaction',
          isCredit: true,
          timestamp: '18 Sep 2026',
        },
        {
          id: 'CN-202',
          coins: 20,
          title: 'Pickup Completed',
          description: 'Final transaction ₹200 • 10% Eco Coins',
          category: 'Transaction',
          isCredit: true,
          timestamp: '17 Sep 2026',
        },
        {
          id: 'CN-203',
          coins: 500,
          title: 'Monthly Ration Voucher Redeemed',
          description: '10kg Rice & Atta Ration Kit',
          category: 'Ration',
          isCredit: false,
          timestamp: '01 Sep 2026',
        },
      ];
    }

    const { data } = await supabaseAdmin
      .from('reward_transactions')
      .select('*')
      .eq('user_id', collectorId)
      .eq('role', 'collector')
      .order('created_at', { ascending: false });

    return (data || []).map((t) => ({
      id: t.id,
      coins: t.amount,
      title: t.title,
      description: t.description,
      category: t.category || 'Transaction',
      isCredit: t.type === 'earned',
      timestamp: t.created_at,
    }));
  }

  async getRewardCatalog(): Promise<RewardCouponItem[]> {
    if (isMockStore()) {
      return inMemoryStore.rewardCatalog.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        pointsCost: c.points_cost,
        partnerName: c.partner_name,
        couponCode: c.coupon_code,
        expiryDate: c.expiry_date,
      }));
    }

    const { data } = await supabaseAdmin
      .from('reward_catalog')
      .select('*')
      .eq('is_active', true);

    return (data || []).map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      pointsCost: c.points_cost,
      partnerName: c.partner_name,
      couponCode: c.coupon_code,
      expiryDate: c.expiry_date,
    }));
  }

  async redeemCoupon(userId: string, catalogId: string): Promise<RewardCouponItem> {
    const catalog = await this.getRewardCatalog();
    const item = catalog.find((c) => c.id === catalogId);
    if (!item) {
      throw new NotFoundError('Reward coupon not found', 'COUPON_NOT_FOUND');
    }

    const isMock = isMockStore();

    if (isMock) {
      const citizen = inMemoryStore.citizenProfiles.get(userId);
      if (citizen && citizen.ecoPoints < item.pointsCost) {
        throw new BadRequestError('Insufficient Eco Points balance to redeem this coupon', 'INSUFFICIENT_BALANCE');
      }
      if (citizen) citizen.ecoPoints -= item.pointsCost;

      inMemoryStore.rewardTransactions.push({
        id: `PT-${Date.now()}`,
        user_id: userId,
        role: 'citizen',
        type: 'redeemed',
        amount: item.pointsCost,
        source: 'catalog_redemption',
        reference_id: item.id,
        title: `${item.title} Redeemed`,
        description: `Code: ${item.couponCode} • Valid until ${item.expiryDate}`,
        timestamp: 'Just now',
      });
      return item;
    }

    // Check balance in Supabase
    const { data: profile } = await supabaseAdmin
      .from('citizen_profiles')
      .select('eco_points_balance')
      .eq('user_id', userId)
      .single();

    const currentBalance = profile?.eco_points_balance || 0;
    if (currentBalance < item.pointsCost) {
      throw new BadRequestError('Insufficient Eco Points balance', 'INSUFFICIENT_BALANCE');
    }

    // Deduct and record
    await supabaseAdmin
      .from('citizen_profiles')
      .update({ eco_points_balance: currentBalance - item.pointsCost })
      .eq('user_id', userId);

    await supabaseAdmin.from('reward_transactions').insert({
      user_id: userId,
      role: 'citizen',
      type: 'redeemed',
      amount: item.pointsCost,
      source: 'catalog_redemption',
      reference_id: item.id,
      title: `${item.title} Redeemed`,
      description: `Code: ${item.couponCode} • Valid until ${item.expiryDate}`,
    });

    return item;
  }
}

export const rewardService = new RewardService();
