import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { supabaseAdmin } from '../../src/config/supabase';

process.env.LIVE_DB = 'true';

describe('FINAL RUNTIME QA: CITIZEN → COLLECTOR → CITIZEN GOLDEN PATH', () => {
  const ts = Date.now();
  const citizenEmail = `qa_citizen_${ts}@ekabadi.test`;
  const citizenPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  const collectorEmail = `qa_col_${ts}@ekabadi.test`;
  const collectorPhone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
  const password = 'QaPassword123!';

  let citizenUserId: string;
  let citizenToken: string;
  let collectorUserId: string;
  let collectorToken: string;
  let pickupId: string;
  let liveOtpCode: string;

  beforeAll(async () => {
    // Register Citizen in Supabase Auth
    const { data: citAuth, error: citErr } = await supabaseAdmin.auth.admin.createUser({
      email: citizenEmail,
      phone: citizenPhone,
      password: password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { name: 'Verified Citizen', role: 'citizen' },
    });
    if (citErr) throw new Error(`Citizen auth setup failed: ${citErr.message}`);
    citizenUserId = citAuth.user.id;

    await supabaseAdmin.from('profiles').insert({
      id: citizenUserId,
      name: 'Verified Citizen',
      phone: citizenPhone,
      email: citizenEmail,
      rating: 4.8,
      is_verified: true,
    });
    await supabaseAdmin.from('user_roles').insert({ user_id: citizenUserId, role: 'citizen' });
    await supabaseAdmin.from('citizen_profiles').insert({ user_id: citizenUserId, eco_points_balance: 0 });

    // Register Collector in Supabase Auth
    const { data: colAuth, error: colErr } = await supabaseAdmin.auth.admin.createUser({
      email: collectorEmail,
      phone: collectorPhone,
      password: password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { name: 'Verified Collector', role: 'collector' },
    });
    if (colErr) throw new Error(`Collector auth setup failed: ${colErr.message}`);
    collectorUserId = colAuth.user.id;

    await supabaseAdmin.from('profiles').insert({
      id: collectorUserId,
      name: 'Verified Collector',
      phone: collectorPhone,
      email: collectorEmail,
      rating: 4.9,
      is_verified: true,
    });
    await supabaseAdmin.from('user_roles').insert({ user_id: collectorUserId, role: 'collector' });
    await supabaseAdmin.from('collector_profiles').insert({
      user_id: collectorUserId,
      eco_coins_balance: 0,
      is_available: true,
      service_area: 'Sector 62, Noida',
    });
  }, 30000);

  it('Step 1: Citizen login works with real Supabase Auth account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: citizenPhone, password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.token.length).toBeGreaterThan(20);
    expect(res.body.data.user.role).toBe('citizen');
    citizenToken = res.body.data.token;

    // Verify /users/me works with this real JWT
    const meRes = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.id).toBe(citizenUserId);
    expect(meRes.body.data.ecoPoints).toBe(0);
  });

  it('Step 2 & 3: Citizen creates pickup successfully; real OTP appears and is saved in Supabase', async () => {
    const res = await request(app)
      .post('/api/v1/pickups')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        items: [
          {
            category: 'Plastic',
            subType: 'PET Bottles',
            weightKg: 10.0,
            pricePerKg: 35.0,
            estimatedTotal: 350.0,
          },
          {
            category: 'Paper',
            subType: 'Cardboard',
            weightKg: 15.0,
            pricePerKg: 20.0,
            estimatedTotal: 300.0,
          },
        ],
        scheduledDate: '2026-09-23',
        timeSlot: '10:00 AM - 12:00 PM',
        address: 'Tower 4, Flat 1002, Sector 62, Noida',
        instructions: 'Call on arrival',
        autoAssign: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toMatch(/^PK-/);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.totalEstimatedPrice).toBe(650.0);
    expect(res.body.data.otpCode).toMatch(/^\d{4}$/);

    pickupId = res.body.data.id;
    liveOtpCode = res.body.data.otpCode;

    // Verify record in live Supabase table
    const { data: dbPickup } = await supabaseAdmin
      .from('pickup_requests')
      .select('id, citizen_id, status, otp_code, total_estimated_price')
      .eq('id', pickupId)
      .single();

    expect(dbPickup).toBeDefined();
    expect(dbPickup.citizen_id).toBe(citizenUserId);
    expect(dbPickup.status).toBe('pending');
    expect(dbPickup.otp_code).toBe(liveOtpCode);
    expect(parseFloat(dbPickup.total_estimated_price)).toBe(650.0);
  });

  it('Step 4: Citizen logout / unauthenticated session returns 401 Unauthorized', async () => {
    // When citizen logs out, TokenStorage is cleared and requests lack Authorization header
    const res = await request(app)
      .get('/api/v1/users/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Step 5: Separate Collector logs in and discovers the pending pickup', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: collectorPhone, password });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    collectorToken = loginRes.body.data.token;
    expect(loginRes.body.data.user.role).toBe('collector');

    const pickupsRes = await request(app)
      .get('/api/v1/pickups')
      .set('Authorization', `Bearer ${collectorToken}`);

    expect(pickupsRes.status).toBe(200);
    expect(Array.isArray(pickupsRes.body.data)).toBe(true);
    const found = pickupsRes.body.data.find((p: any) => p.id === pickupId);
    expect(found).toBeDefined();
    expect(found.status).toBe('pending');
  });

  it('Step 6: Accept → onTheWay → arrived works and persists in Supabase', async () => {
    // 1. Accept
    const acceptRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({ status: 'accepted' });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('accepted');

    // 2. onTheWay
    const onTheWayRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({ status: 'onTheWay' });
    expect(onTheWayRes.status).toBe(200);
    expect(onTheWayRes.body.data.status).toBe('onTheWay');

    // 3. arrived
    const arrivedRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({ status: 'arrived' });
    expect(arrivedRes.status).toBe(200);
    expect(arrivedRes.body.data.status).toBe('arrived');

    // Verify persistence in live Supabase table
    const { data: dbPickup } = await supabaseAdmin
      .from('pickup_requests')
      .select('status, collector_id')
      .eq('id', pickupId)
      .single();

    expect(dbPickup.status).toBe('arrived');
    expect(dbPickup.collector_id).toBe(collectorUserId);
  });

  it('Step 8 (Negative QA): Backend rejects incorrect OTP and invalid state transitions', async () => {
    // 1. Reject wrong OTP (e.g. '0000')
    const badOtpRes = await request(app)
      .post(`/api/v1/pickups/${pickupId}/verify`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({
        otpCode: '0000',
        finalWeight: 25.0,
        finalAmount: 650.0,
      });

    expect(badOtpRes.status).toBe(400);
    expect(badOtpRes.body.success).toBe(false);

    // 2. Reject illegal backward state transition (arrived -> pending)
    const illegalTransitionRes = await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({ status: 'pending' });

    expect(illegalTransitionRes.status).toBe(400);
    expect(illegalTransitionRes.body.success).toBe(false);

    // Verify DB status remains 'arrived'
    const { data: dbPickup } = await supabaseAdmin
      .from('pickup_requests')
      .select('status')
      .eq('id', pickupId)
      .single();
    expect(dbPickup.status).toBe('arrived');
  });

  it('Step 7: Collector enters actual OTP + scale weight + final amount; status becomes verified', async () => {
    const verifyRes = await request(app)
      .post(`/api/v1/pickups/${pickupId}/verify`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({
        otpCode: liveOtpCode,
        finalWeight: 25.5,
        finalAmount: 660.0,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.status).toBe('verified');
    expect(verifyRes.body.data.finalVerifiedWeight).toBe(25.5);
    expect(verifyRes.body.data.finalVerifiedPrice).toBe(660.0);

    // Verify in live Supabase table
    const { data: dbPickup } = await supabaseAdmin
      .from('pickup_requests')
      .select('status, final_verified_weight, final_verified_price')
      .eq('id', pickupId)
      .single();

    expect(dbPickup.status).toBe('verified');
    expect(parseFloat(dbPickup.final_verified_weight)).toBe(25.5);
    expect(parseFloat(dbPickup.final_verified_price)).toBe(660.0);
  });

  it('Step 9: Successful verification completes payment and credits rewards exactly once', async () => {
    // 1. Create order
    const orderRes = await request(app)
      .post('/api/v1/payments/create')
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({ pickupId });

    expect([200, 201]).toContain(orderRes.status);
    expect(orderRes.body.data.orderId).toBeDefined();
    expect(orderRes.body.data.amount).toBe(660.0);

    // 2. Verify payment
    const paymentId = `dev_pay_${Date.now()}`;
    const payRes = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({
        pickupId,
        orderId: orderRes.body.data.orderId,
        paymentId,
        method: 'UPI / Mock Gateway',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(true);
    expect(payRes.body.data.status).toBe('SUCCESS');

    // 660 >= 500 => 10% = 66 points to citizen
    expect(payRes.body.data.ecoPointsEarned ?? payRes.body.data.rewardsAwarded?.citizenPoints).toBe(66);

    // Verify in live Supabase DB: pickup is 'completed'
    const { data: dbPickup } = await supabaseAdmin
      .from('pickup_requests')
      .select('status')
      .eq('id', pickupId)
      .single();
    expect(dbPickup.status).toBe('completed');

    // Verify payments table has 1 record
    const { data: dbPayments } = await supabaseAdmin
      .from('payments')
      .select('id, amount, status')
      .eq('pickup_id', pickupId);
    expect(dbPayments?.length).toBe(1);
    expect(parseFloat(dbPayments![0].amount)).toBe(660.0);
  });

  it('Step 11: Duplicate payment / verification taps do not create duplicate rewards or payment records', async () => {
    // Attempt duplicate verification of the same payment
    const dupPayRes = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({
        pickupId,
        orderId: 'dup_order_id',
        paymentId: `dup_pay_${Date.now()}`,
        method: 'UPI / Mock Gateway',
      });

    // Backend must handle idempotently (either returns already completed / 200 with 0 additional rewards, or rejects)
    // Most importantly: Database records must NOT duplicate!
    const { data: dbPayments } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('pickup_id', pickupId);
    expect(dbPayments?.length).toBe(1);

    // Reward transactions for this pickup must remain strictly 1 for citizen and 1 for collector
    const { data: citRewards } = await supabaseAdmin
      .from('reward_transactions')
      .select('id, amount')
      .eq('user_id', citizenUserId)
      .eq('reference_id', pickupId);
    expect(citRewards?.length).toBe(1);
    expect(citRewards![0].amount).toBe(66);

    const { data: colRewards } = await supabaseAdmin
      .from('reward_transactions')
      .select('id, amount')
      .eq('user_id', collectorUserId)
      .eq('reference_id', pickupId);
    expect(colRewards?.length).toBe(1);
    expect(colRewards![0].amount).toBe(66);
  });

  it('Step 10: Citizen re-login shows completed pickup, real rewards balance, and real recycling journey', async () => {
    // Citizen re-authenticates
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: citizenPhone, password });

    expect(loginRes.status).toBe(200);
    const newCitizenToken = loginRes.body.data.token;

    // 1. /users/me shows real updated Eco Points balance
    const meRes = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${newCitizenToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.ecoPoints).toBe(66);

    // 2. /pickups shows the completed pickup with verified amounts
    const pickupsRes = await request(app)
      .get('/api/v1/pickups')
      .set('Authorization', `Bearer ${newCitizenToken}`);
    expect(pickupsRes.status).toBe(200);
    const pickup = pickupsRes.body.data.find((p: any) => p.id === pickupId);
    expect(pickup).toBeDefined();
    expect(pickup.status).toBe('completed');
    expect(pickup.finalVerifiedWeight).toBe(25.5);
    expect(pickup.finalVerifiedPrice).toBe(660.0);

    // 3. /recycling/pickup/:id returns authentic recycling journey with actual names
    const journeyRes = await request(app)
      .get(`/api/v1/recycling/pickup/${pickupId}`)
      .set('Authorization', `Bearer ${newCitizenToken}`);
    expect(journeyRes.status).toBe(200);
    expect(journeyRes.body.data.pickupId).toBe(pickupId);
    expect(journeyRes.body.data.citizenName).toBe('Verified Citizen');
    expect(journeyRes.body.data.collectorName).toBe('Verified Collector');
    expect(journeyRes.body.data.weightKg).toBe(25.5);
    expect(journeyRes.body.data.steps.length).toBeGreaterThanOrEqual(3);
  });

  it('Step 12: Network / API failure returns structured error and is not silently treated as success', async () => {
    // Test with invalid endpoint
    const notFoundRes = await request(app)
      .get('/api/v1/invalid-endpoint-qa')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.success).toBe(false);
    expect(notFoundRes.body.error?.message || notFoundRes.body.message).toBeDefined();

    // Test with malformed payload
    const badPayloadRes = await request(app)
      .post('/api/v1/pickups')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ invalidField: true });

    expect([400, 422]).toContain(badPayloadRes.status);
    expect(badPayloadRes.body.success).toBe(false);
    expect(badPayloadRes.body.error?.message || badPayloadRes.body.message).toBeDefined();
  });
});
