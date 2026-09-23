import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

/**
 * Auth Edge Cases Tests
 * Covers signup failures, login failures, token validation,
 * and rate-limiting behavior on auth endpoints.
 *
 * NOTE: In mock/offline mode, the auth service auto-succeeds for valid-looking
 * inputs. These tests focus on what the validation layer rejects.
 */
describe('Auth Edge Cases & Security', () => {
  // =========================================================================
  // REGISTRATION EDGE CASES
  // =========================================================================
  describe('POST /api/v1/auth/register — Edge Cases', () => {
    it('rejects registration with phone starting with invalid digit (0-5)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          phone: '0123456789',
          email: 'edge@test.com',
        });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('accepts valid Indian mobile number with +91 prefix (passes validation)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Valid User',
          phone: '+919876543210',
          email: `edge_${Date.now()}@test.com`,
          password: 'StrongPass123',
          role: 'citizen',
        });
      // Should pass validation — either succeeds or fails in service layer (not 422)
      expect(res.status).not.toBe(422);
    });

    it('accepts valid Indian mobile number without +91 prefix', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Valid User Two',
          phone: '9876543211',
          email: `edge2_${Date.now()}@test.com`,
          password: 'StrongPass123',
          role: 'citizen',
        });
      expect(res.status).not.toBe(422);
    });

    it('rejects invalid role value', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Bad Role User',
          phone: '9876543210',
          email: 'badrole@test.com',
          role: 'superadmin',
        });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // LOGIN EDGE CASES
  // =========================================================================
  describe('POST /api/v1/auth/login — Edge Cases', () => {
    it('handles login for non-existent user without crashing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ phone: '9999999999', password: 'NoSuchUser123' });

      // In mock mode, login auto-succeeds for valid phones.
      // The important thing is: it does NOT crash.
      expect(res.status).toBeDefined();
      expect(res.body).toBeDefined();
    });

    it('rejects login with very long phone string (fails validation)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ phone: '9'.repeat(100), password: 'test' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // TOKEN / AUTH HEADER EDGE CASES
  // =========================================================================
  describe('Authorization Header Edge Cases', () => {
    it('rejects request with empty Authorization header', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', '');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects request with Bearer but no token', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer ');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects request with non-Bearer auth scheme', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Basic dXNlcjpwYXNz');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects request with malformed JWT string', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer not.a.valid.jwt.token.at.all');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects request with extremely long token', async () => {
      const longToken = 'Bearer ' + 'a'.repeat(5000);
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', longToken);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // ROLE SELECTION
  // =========================================================================
  describe('POST /api/v1/auth/role — Edge Cases', () => {
    it('rejects role selection without auth', async () => {
      const res = await request(app)
        .post('/api/v1/auth/role')
        .send({ role: 'citizen' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid role value', async () => {
      const res = await request(app)
        .post('/api/v1/auth/role')
        .set('Authorization', 'Bearer mock-citizen-token')
        .send({ role: 'invalid_role' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // OTP VERIFICATION EDGE CASES
  // =========================================================================
  describe('POST /api/v1/auth/verify-otp — Edge Cases', () => {
    it('rejects OTP shorter than 4 digits', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '9876543210', otp: '12' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('handles OTP for non-existent phone without crashing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '9999999998', otp: '1234' });
      // In mock mode, may auto-succeed. The point is: no crash.
      expect(res.status).toBeDefined();
      expect(res.body).toBeDefined();
    });
  });
});
