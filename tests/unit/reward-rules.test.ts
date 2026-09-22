import { describe, it, expect } from 'vitest';
import { rewardService } from '../../src/services/reward.service';
import { APP_CONSTANTS } from '../../src/config/constants';

describe('Unit Test: Reward Rules & Ledger Logic (Frontend Source of Truth)', () => {
  describe('Citizen Eco Points Rule (₹500 threshold)', () => {
    it('returns 0 points when final verified bill is strictly below ₹500', () => {
      expect(rewardService.calculateCitizenEcoPoints(0)).toBe(0);
      expect(rewardService.calculateCitizenEcoPoints(50)).toBe(0);
      expect(rewardService.calculateCitizenEcoPoints(118)).toBe(0);
      expect(rewardService.calculateCitizenEcoPoints(499)).toBe(0);
      expect(rewardService.calculateCitizenEcoPoints(499.99)).toBe(0);
    });

    it('returns exactly 10% (floored) when final verified bill is ₹500 or higher', () => {
      expect(rewardService.calculateCitizenEcoPoints(500)).toBe(50);
      expect(rewardService.calculateCitizenEcoPoints(509)).toBe(50);
      expect(rewardService.calculateCitizenEcoPoints(750)).toBe(75);
      expect(rewardService.calculateCitizenEcoPoints(1000)).toBe(100);
      expect(rewardService.calculateCitizenEcoPoints(1280.75)).toBe(128);
    });
  });

  describe('Collector Eco Coins Rule (10% on every transaction, no threshold)', () => {
    it('returns 10% on any positive transaction amount without minimum threshold', () => {
      expect(rewardService.calculateCollectorEcoCoins(0)).toBe(0);
      expect(rewardService.calculateCollectorEcoCoins(50)).toBe(5);
      expect(rewardService.calculateCollectorEcoCoins(118)).toBe(11);
      expect(rewardService.calculateCollectorEcoCoins(499)).toBe(49);
      expect(rewardService.calculateCollectorEcoCoins(500)).toBe(50);
      expect(rewardService.calculateCollectorEcoCoins(1280)).toBe(128);
    });
  });

  describe('Constants Alignment with Flutter specification', () => {
    it('uses correct 10% reward rate and ₹500 citizen threshold', () => {
      expect(APP_CONSTANTS.REWARD_RATE).toBe(0.1);
      expect(APP_CONSTANTS.CITIZEN_MIN_BILL_FOR_POINTS).toBe(500);
    });
  });
});
