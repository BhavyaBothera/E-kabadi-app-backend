import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

/**
 * API Contract Validation Tests
 * Verifies that all endpoints reject malformed, missing, or type-mismatched inputs
 * with appropriate 422 error responses (Zod validation) and structured error bodies.
 *
 * The validation middleware uses 422 VALIDATION_ERROR for Zod schema failures.
 */
describe('API Contract Validation', () => {
  const citizenToken = 'mock-citizen-token';
  const collectorToken = 'mock-collector-token';

  // =========================================================================
  // AUTH ENDPOINTS
  // =========================================================================
  describe('POST /api/v1/auth/register — Input Validation', () => {
    it('rejects empty body with 422', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({});
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects missing name', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ phone: '9876543210', email: 'test@test.com' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid phone format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Test User', phone: '12345', email: 'test@test.com' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Test User', phone: '9876543210', email: 'not-an-email' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects name shorter than 2 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'A', phone: '9876543210', email: 'test@test.com' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login — Input Validation', () => {
    it('rejects empty body with validation error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects phone with letters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ phone: 'abcdefghij' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects phone with too few digits', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ phone: '12345' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/verify-otp — Input Validation', () => {
    it('rejects empty body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({});
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects missing OTP', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '9876543210' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects OTP longer than 6 digits', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '9876543210', otp: '12345678' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // PICKUP ENDPOINTS
  // =========================================================================
  describe('POST /api/v1/pickups — Input Validation', () => {
    it('rejects empty body', async () => {
      const res = await request(app)
        .post('/api/v1/pickups')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({});
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects missing items array', async () => {
      const res = await request(app)
        .post('/api/v1/pickups')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          scheduledDate: '2026-09-25',
          timeSlot: '10 AM - 12 PM',
          address: 'Some street, Noida',
        });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects empty items array', async () => {
      const res = await request(app)
        .post('/api/v1/pickups')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          items: [],
          scheduledDate: '2026-09-25',
          timeSlot: '10 AM - 12 PM',
          address: 'Some street, Noida',
        });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects item with negative weight', async () => {
      const res = await request(app)
        .post('/api/v1/pickups')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          items: [{ category: 'Plastic', subType: 'Bottles', weightKg: -5, pricePerKg: 50 }],
          scheduledDate: '2026-09-25',
          timeSlot: '10 AM - 12 PM',
          address: 'Some street, Noida',
        });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects item with missing category', async () => {
      const res = await request(app)
        .post('/api/v1/pickups')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          items: [{ subType: 'Bottles', weightKg: 5, pricePerKg: 50 }],
          scheduledDate: '2026-09-25',
          timeSlot: '10 AM - 12 PM',
          address: 'Some street, Noida',
        });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects missing scheduledDate', async () => {
      const res = await request(app)
        .post('/api/v1/pickups')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          items: [{ category: 'Plastic', subType: 'Bottles', weightKg: 5, pricePerKg: 50 }],
          timeSlot: '10 AM - 12 PM',
          address: 'Some street, Noida',
        });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects address shorter than 5 characters', async () => {
      const res = await request(app)
        .post('/api/v1/pickups')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          items: [{ category: 'Plastic', subType: 'Bottles', weightKg: 5, pricePerKg: 50 }],
          scheduledDate: '2026-09-25',
          timeSlot: '10 AM - 12 PM',
          address: 'AB',
        });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/pickups/:id/status — Input Validation', () => {
    it('rejects invalid status value', async () => {
      const res = await request(app)
        .patch('/api/v1/pickups/PK-9999/status')
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({ status: 'invalid_status' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects empty body', async () => {
      const res = await request(app)
        .patch('/api/v1/pickups/PK-9999/status')
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({});
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/pickups/:id/verify — Input Validation', () => {
    it('rejects missing otpCode', async () => {
      const res = await request(app)
        .post('/api/v1/pickups/PK-9999/verify')
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({ finalWeight: 10, finalAmount: 500 });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects zero finalWeight', async () => {
      const res = await request(app)
        .post('/api/v1/pickups/PK-9999/verify')
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({ otpCode: '1234', finalWeight: 0, finalAmount: 500 });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects negative finalAmount', async () => {
      const res = await request(app)
        .post('/api/v1/pickups/PK-9999/verify')
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({ otpCode: '1234', finalWeight: 10, finalAmount: -100 });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // PAYMENT ENDPOINTS
  // =========================================================================
  describe('POST /api/v1/payments/create — Input Validation', () => {
    it('rejects empty body', async () => {
      const res = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({});
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects missing pickupId', async () => {
      const res = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ amount: 500 });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/payments/verify — Input Validation', () => {
    it('rejects empty body', async () => {
      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({});
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects missing orderId', async () => {
      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ pickupId: 'PK-1234', paymentId: 'pay_123' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // SCRAP ENDPOINTS
  // =========================================================================
  describe('POST /api/v1/scrap/analyze — Input Validation', () => {
    it('rejects empty body', async () => {
      const res = await request(app)
        .post('/api/v1/scrap/analyze')
        .send({});
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects missing image field', async () => {
      const res = await request(app)
        .post('/api/v1/scrap/analyze')
        .send({ isFromCamera: true });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects empty image string', async () => {
      const res = await request(app)
        .post('/api/v1/scrap/analyze')
        .send({ image: '' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // REWARD ENDPOINTS
  // =========================================================================
  describe('POST /api/v1/rewards/redeem — Input Validation', () => {
    it('rejects empty body', async () => {
      const res = await request(app)
        .post('/api/v1/rewards/redeem')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({});
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects missing catalogId', async () => {
      const res = await request(app)
        .post('/api/v1/rewards/redeem')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ quantity: 1 });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // COLLECTOR ENDPOINTS
  // =========================================================================
  describe('PATCH /api/v1/collectors/location — Input Validation', () => {
    it('rejects latitude out of range', async () => {
      const res = await request(app)
        .patch('/api/v1/collectors/location')
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({ latitude: 95, longitude: 77 });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects longitude out of range', async () => {
      const res = await request(app)
        .patch('/api/v1/collectors/location')
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({ latitude: 28, longitude: 200 });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 404 / METHOD SAFETY
  // =========================================================================
  describe('404 and Method Safety', () => {
    it('returns 404 for unknown route', async () => {
      const res = await request(app).get('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns structured error body on 404', async () => {
      const res = await request(app).delete('/api/v1/unknown-resource');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code || res.body.error?.message).toBeDefined();
    });
  });

  // =========================================================================
  // JSON PARSING SAFETY
  // =========================================================================
  describe('Malformed JSON Handling', () => {
    it('rejects malformed JSON with error status', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      expect([400, 500]).toContain(res.status);
    });
  });
});
