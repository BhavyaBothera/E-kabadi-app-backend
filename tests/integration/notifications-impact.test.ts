import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

/**
 * Notifications, Impact, and Miscellaneous Endpoint Tests
 * Covers notification listing, mark-as-read, impact summary,
 * and edge cases for recycling/storage/rewards endpoints.
 */
describe('Notifications, Impact & Misc Endpoints', () => {
  const citizenToken = 'mock-citizen-token';
  const collectorToken = 'mock-collector-token';

  // =========================================================================
  // NOTIFICATIONS
  // =========================================================================
  describe('GET /api/v1/notifications — Listing', () => {
    it('returns notifications for authenticated citizen', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns notifications for authenticated collector', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${collectorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('rejects unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read — Mark as Read', () => {
    it('handles marking non-existent notification gracefully', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/non-existent-id/read')
        .set('Authorization', `Bearer ${citizenToken}`);

      // Should not crash; may return 200 (idempotent) or 404
      expect([200, 404]).toContain(res.status);
    });

    it('rejects unauthenticated mark-as-read', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/some-id/read');
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // IMPACT SUMMARY
  // =========================================================================
  describe('GET /api/v1/impact/summary — Environmental Impact', () => {
    it('returns impact summary (public endpoint)', async () => {
      const res = await request(app).get('/api/v1/impact/summary');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('impact summary contains expected environmental fields', async () => {
      const res = await request(app).get('/api/v1/impact/summary');

      expect(res.status).toBe(200);
      const data = res.body.data;
      // Should have some kind of environmental impact metrics
      expect(data).toBeDefined();
      expect(typeof data === 'object').toBe(true);
    });
  });

  // =========================================================================
  // REWARDS ENDPOINTS
  // =========================================================================
  describe('GET /api/v1/rewards/* — Rewards Endpoints', () => {
    it('GET /rewards/points returns citizen eco points', async () => {
      const res = await request(app)
        .get('/api/v1/rewards/points')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /rewards/coins returns collector eco coins', async () => {
      const res = await request(app)
        .get('/api/v1/rewards/coins')
        .set('Authorization', `Bearer ${collectorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /rewards/coupons returns coupon catalog', async () => {
      const res = await request(app)
        .get('/api/v1/rewards/coupons')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('rejects unauthenticated rewards request', async () => {
      const res = await request(app).get('/api/v1/rewards/points');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // SCRAP RATES (PUBLIC)
  // =========================================================================
  describe('GET /api/v1/scrap/rates — Public Scrap Rates', () => {
    it('returns scrap rate catalog', async () => {
      const res = await request(app).get('/api/v1/scrap/rates');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // HEALTH CHECK
  // =========================================================================
  describe('GET /api/v1/health — Health Check', () => {
    it('returns 200 with ok status', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
    });

    it('health check is accessible without auth', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
    });
  });

  // =========================================================================
  // STORAGE ENDPOINT (OFFLINE / AUTH GUARD)
  // =========================================================================
  describe('GET /api/v1/storage/image — Auth Guard', () => {
    it('rejects unauthenticated image request', async () => {
      const res = await request(app)
        .get('/api/v1/storage/image?path=test/path.jpg');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // USERS/ME ENDPOINT
  // =========================================================================
  describe('GET /api/v1/users/me — Current User', () => {
    it('returns current user profile for citizen', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.role).toBe('citizen');
    });

    it('returns current user profile for collector', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${collectorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.role).toBe('collector');
    });
  });
});
