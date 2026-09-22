import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('Milestone 3 E2E Demonstration: Complete Pickup Flow', () => {
  const citizenToken = 'mock-citizen-token';
  const collectorToken = 'mock-collector-token';

  let createdPickupId = '';
  let generatedOtp = '';

  it('1. Verifies system health and readiness', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('2. Citizen discovers scrap rates and analyzes scrap image via AI', async () => {
    // Check rates
    const ratesRes = await request(app).get('/api/v1/scrap/rates');
    expect(ratesRes.status).toBe(200);
    expect(ratesRes.body.data.length).toBeGreaterThan(0);

    // AI Analysis
    const aiRes = await request(app)
      .post('/api/v1/scrap/analyze')
      .send({
        image: 'base64-mock-scrap-image-pet-bottles',
        isFromCamera: true,
      });

    expect(aiRes.status).toBe(200);
    expect(aiRes.body.success).toBe(true);
    expect(aiRes.body.data.length).toBeGreaterThan(0);
    expect(aiRes.body.data[0].category).toBe('Plastic');
  });

  it('3. Citizen creates a pickup request and auto-matches an available collector', async () => {
    const pickupPayload = {
      items: [
        {
          category: 'Plastic',
          subType: 'PET Bottles',
          weightKg: 1.4,
          pricePerKg: 50.0,
          estimatedTotal: 70.0,
          confidenceScore: 0.94,
        },
        {
          category: 'Paper & Cardboard',
          subType: 'Corrugated Boxes',
          weightKg: 3.2,
          pricePerKg: 15.0,
          estimatedTotal: 48.0,
          confidenceScore: 0.91,
        },
      ],
      scheduledDate: 'Today, 18 Sep',
      timeSlot: '11 AM - 1 PM',
      address: 'Flat 402, Green Valley Apts, Sector 62, Noida',
      instructions: 'Ring bell twice upon arrival',
      autoAssign: true,
    };

    const res = await request(app)
      .post('/api/v1/pickups')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send(pickupPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toMatch(/^PK-/);
    expect(res.body.data.totalEstimatedPrice).toBe(118.0);
    expect(res.body.data.otpCode).toBeDefined();
    expect(res.body.data.collectorId).toBeDefined();

    createdPickupId = res.body.data.id;
    generatedOtp = res.body.data.otpCode;
  });

  it('4. Collector accepts and starts journey towards citizen (status: onTheWay)', async () => {
    const res = await request(app)
      .patch(`/api/v1/pickups/${createdPickupId}/status`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({
        status: 'onTheWay',
        notes: 'Collector on the way in electric vehicle',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('onTheWay');
  });

  it('5. Collector arrives at citizen location (status: arrived)', async () => {
    const res = await request(app)
      .patch(`/api/v1/pickups/${createdPickupId}/status`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({
        status: 'arrived',
        notes: 'Arrived at gate',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('arrived');
  });

  it('6. Collector verifies scrap with citizen OTP, weighing scale and authoritative pricing', async () => {
    const res = await request(app)
      .post(`/api/v1/pickups/${createdPickupId}/verify`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({
        otpCode: generatedOtp,
        finalWeight: 4.6,
        finalAmount: 118.0,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('verified');
    expect(res.body.data.finalVerifiedWeight).toBe(4.6);
    expect(res.body.data.finalVerifiedPrice).toBe(118.0);
  });

  it('7. State Machine Defense: Rejects illegal backward transition (verified -> pending)', async () => {
    const res = await request(app)
      .patch(`/api/v1/pickups/${createdPickupId}/status`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({
        status: 'pending',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });
});
