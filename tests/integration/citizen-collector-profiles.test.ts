import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

/**
 * Citizen & Collector Profile Tests
 * Verifies profile CRUD, dashboard data, role isolation,
 * and endpoint access control.
 */
describe('Citizen & Collector Profile Endpoints', () => {
  const citizenToken = 'mock-citizen-token';
  const collectorToken = 'mock-collector-token';

  // =========================================================================
  // CITIZEN PROFILE ENDPOINTS
  // =========================================================================
  describe('Citizen Dashboard & Profile', () => {
    it('GET /citizens/dashboard returns dashboard data for authenticated citizen', async () => {
      const res = await request(app)
        .get('/api/v1/citizens/dashboard')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('GET /citizens/dashboard rejects unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/citizens/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /citizens/dashboard rejects collector token (role isolation)', async () => {
      const res = await request(app)
        .get('/api/v1/citizens/dashboard')
        .set('Authorization', `Bearer ${collectorToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('PATCH /citizens/profile updates citizen name', async () => {
      const res = await request(app)
        .patch('/api/v1/citizens/profile')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ name: 'Updated Citizen Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('PATCH /citizens/profile rejects name < 2 chars', async () => {
      const res = await request(app)
        .patch('/api/v1/citizens/profile')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ name: 'A' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('PATCH /citizens/profile rejects invalid email', async () => {
      const res = await request(app)
        .patch('/api/v1/citizens/profile')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ email: 'not-valid' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('GET /citizens/addresses returns addresses list', async () => {
      const res = await request(app)
        .get('/api/v1/citizens/addresses')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /citizens/addresses rejects short address', async () => {
      const res = await request(app)
        .post('/api/v1/citizens/addresses')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ addressLine: 'AB' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('POST /citizens/addresses creates a new address', async () => {
      const res = await request(app)
        .post('/api/v1/citizens/addresses')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: 'Office',
          addressLine: 'Tower 5, Floor 12, Sector 62, Noida',
          city: 'Noida',
          state: 'Uttar Pradesh',
          pincode: '201301',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================================
  // COLLECTOR PROFILE ENDPOINTS
  // =========================================================================
  describe('Collector Status, Location & Earnings', () => {
    it('PATCH /collectors/status updates collector availability', async () => {
      const res = await request(app)
        .patch('/api/v1/collectors/status')
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({ isAvailable: true, status: 'Active' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('PATCH /collectors/status rejects citizen token (role isolation)', async () => {
      const res = await request(app)
        .patch('/api/v1/collectors/status')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ isAvailable: true });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('PATCH /collectors/status rejects invalid status enum', async () => {
      const res = await request(app)
        .patch('/api/v1/collectors/status')
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({ status: 'InvalidStatus' });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('PATCH /collectors/location updates GPS coordinates', async () => {
      const res = await request(app)
        .patch('/api/v1/collectors/location')
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({ latitude: 28.615, longitude: 77.210 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('PATCH /collectors/location rejects citizen token', async () => {
      const res = await request(app)
        .patch('/api/v1/collectors/location')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ latitude: 28.615, longitude: 77.210 });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('GET /collectors/earnings returns earnings for collector', async () => {
      const res = await request(app)
        .get('/api/v1/collectors/earnings')
        .set('Authorization', `Bearer ${collectorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /collectors/earnings rejects citizen token', async () => {
      const res = await request(app)
        .get('/api/v1/collectors/earnings')
        .set('Authorization', `Bearer ${citizenToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('GET /collectors/nearby returns nearby collectors (public)', async () => {
      const res = await request(app)
        .get('/api/v1/collectors/nearby?latitude=28.6139&longitude=77.209');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // =========================================================================
  // CROSS-ROLE ISOLATION
  // =========================================================================
  describe('Cross-Role Access Isolation', () => {
    it('collector cannot access citizen dashboard', async () => {
      const res = await request(app)
        .get('/api/v1/citizens/dashboard')
        .set('Authorization', `Bearer ${collectorToken}`);
      expect(res.status).toBe(403);
    });

    it('citizen cannot update collector status', async () => {
      const res = await request(app)
        .patch('/api/v1/collectors/status')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ isAvailable: false });
      expect(res.status).toBe(403);
    });

    it('citizen cannot update collector location', async () => {
      const res = await request(app)
        .patch('/api/v1/collectors/location')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ latitude: 28.5, longitude: 77.3 });
      expect(res.status).toBe(403);
    });

    it('citizen cannot view collector earnings', async () => {
      const res = await request(app)
        .get('/api/v1/collectors/earnings')
        .set('Authorization', `Bearer ${citizenToken}`);
      expect(res.status).toBe(403);
    });
  });
});
