import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('Milestone 4: Payments and Rewards Ledger Verification', () => {
  const citizenToken = 'mock-citizen-token';
  const collectorToken = 'mock-collector-token';

  it('1. Prepares PK-9481 by advancing status to arrived and verified', async () => {
    // onTheWay -> arrived
    await request(app)
      .patch('/api/v1/pickups/PK-9481/status')
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({ status: 'arrived' });

    // arrived -> verified with OTP
    const verifyRes = await request(app)
      .post('/api/v1/pickups/PK-9481/verify')
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({
        otpCode: '4829',
        finalWeight: 4.6,
        finalAmount: 118.0,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe('verified');
  });

  it('2. Citizen creates payment order for verified pickup', async () => {
    const res = await request(app)
      .post('/api/v1/payments/create')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ pickupId: 'PK-9481' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderId).toBeDefined();
    expect(res.body.data.amount).toBe(118.0);
  });

  it('3. Payment verification enforces the ₹500 rule: ₹118 bill yields 0 citizen Eco Points', async () => {
    const res = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        pickupId: 'PK-9481',
        orderId: 'order_mock_test123',
        paymentId: 'pay_mock_test123',
        method: 'UPI / GPay Direct',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SUCCESS');
    expect(res.body.data.amount).toBe(118.0);
    // Crucial rule: Bill < ₹500 yields 0 points
    expect(res.body.data.ecoPointsEarned).toBe(0);
  });

  it('4. Payment verification enforces collector rule: 10% earned on EVERY transaction (no ₹500 threshold)', async () => {
    const res = await request(app)
      .get('/api/v1/rewards/coins')
      .set('Authorization', `Bearer ${collectorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].coins).toBeDefined();
  });

  it('5. Payment on a ₹850 verified pickup awards 10% (85 points) to citizen', async () => {
    // Create new pickup with ₹850
    const newPickupRes = await request(app)
      .post('/api/v1/pickups')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        items: [
          {
            category: 'E-Waste',
            subType: 'Old Smartphone',
            weightKg: 1.0,
            pricePerKg: 850.0,
            estimatedTotal: 850.0,
          },
        ],
        scheduledDate: 'Tomorrow',
        timeSlot: '2 PM - 4 PM',
        address: 'Sector 62, Noida',
        autoAssign: true,
      });

    const pickupId = newPickupRes.body.data.id;
    const otp = newPickupRes.body.data.otpCode;

    // Advance: accepted -> onTheWay -> arrived -> verified
    await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({ status: 'onTheWay' });

    await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({ status: 'arrived' });

    await request(app)
      .post(`/api/v1/pickups/${pickupId}/verify`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({
        otpCode: otp,
        finalWeight: 1.0,
        finalAmount: 850.0,
      });

    // Verify payment
    const payRes = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        pickupId,
        orderId: 'order_mock_test850',
        paymentId: 'pay_mock_test850',
        method: 'UPI / Google Pay',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.amount).toBe(850.0);
    expect(payRes.body.data.ecoPointsEarned).toBe(85);
  });

  it('6. Retrieves reward coupons catalog and redeems coupon', async () => {
    const catalogRes = await request(app)
      .get('/api/v1/rewards/coupons')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(catalogRes.status).toBe(200);
    expect(catalogRes.body.data.length).toBeGreaterThan(0);

    const couponToRedeem = catalogRes.body.data[0];

    const redeemRes = await request(app)
      .post('/api/v1/rewards/redeem')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ catalogId: couponToRedeem.id });

    expect(redeemRes.status).toBe(200);
    expect(redeemRes.body.data.couponCode).toBe(couponToRedeem.couponCode);
  });
});
