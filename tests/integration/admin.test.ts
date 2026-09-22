import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('Milestone 6: Admin Management & Role-Based Access Control', () => {
  const citizenToken = 'mock-citizen-token';
  const collectorToken = 'mock-collector-token';
  const adminToken = 'mock-admin-token';

  it('1. Rejects unauthenticated request with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/admin/dashboard');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2. Rejects citizen token with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('3. Rejects collector token with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${collectorToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('4. Admin retrieves dashboard overview metrics', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.statCitizens).toBeGreaterThanOrEqual(1);
    expect(res.body.data.statCollectors).toBeGreaterThanOrEqual(1);
    expect(res.body.data.statPickups).toBeGreaterThanOrEqual(1);
  });

  it('5. Admin fetches list of citizens and modifies coins', async () => {
    const listRes = await request(app)
      .get('/api/v1/admin/citizens')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data)).toBe(true);

    const targetCitizenId = listRes.body.data[0]?.id || 'mock-citizen-001';

    const modifyRes = await request(app)
      .patch(`/api/v1/admin/citizens/${targetCitizenId}/coins`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 25,
        action: 'add',
      });

    expect(modifyRes.status).toBe(200);
    expect(modifyRes.body.success).toBe(true);
    expect(modifyRes.body.data.newBalance).toBeGreaterThanOrEqual(25);
  });

  it('6. Admin fetches collectors and toggles collector active status', async () => {
    const listRes = await request(app)
      .get('/api/v1/admin/collectors')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data)).toBe(true);

    const targetCollectorId = listRes.body.data[0]?.id || 'col-001';

    const toggleRes = await request(app)
      .patch(`/api/v1/admin/collectors/${targetCollectorId}/status`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.success).toBe(true);
    expect(['Active', 'Offline']).toContain(toggleRes.body.data.newStatus);
  });

  it('7. Admin reassigns pickup collector', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/pickups/PK-9481/reassign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collectorId: 'col-002',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.collectorId).toBe('col-002');
  });

  it('8. Admin views system audit logs', async () => {
    const res = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
