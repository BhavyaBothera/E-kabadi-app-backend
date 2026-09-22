import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import request from 'supertest';
import app from '../../src/app';
import { env } from '../../src/config/env';
import { supabaseAdmin } from '../../src/config/supabase';

// Explicitly set LIVE_DB to true for this test suite
process.env.LIVE_DB = 'true';

describe('LIVE SUPABASE VERIFICATION SUITE', () => {
  const anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  // Real test credentials for live Supabase
  const testCitizenEmail = `live_test_citizen_${Date.now()}@ekabadi.test`;
  const testCitizenPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testCollectorEmail = `live_test_col_${Date.now()}@ekabadi.test`;
  const testCollectorPhone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testPassword = 'Password123!';

  let citizenUserId: string;
  let citizenToken: string;
  let collectorUserId: string;
  let collectorToken: string;
  let livePickupId: string;
  let liveOtpCode: string;

  beforeAll(async () => {
    // 1. Create real citizen in live Supabase Auth
    const { data: citAuth, error: citErr } = await supabaseAdmin.auth.admin.createUser({
      email: testCitizenEmail,
      phone: testCitizenPhone,
      password: testPassword,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { name: 'Live Citizen Tester', role: 'citizen' },
    });

    if (citErr) throw new Error(`Live Citizen creation failed: ${citErr.message}`);
    citizenUserId = citAuth.user.id;

    // Insert citizen profile & roles
    await supabaseAdmin.from('profiles').insert({
      id: citizenUserId,
      name: 'Live Citizen Tester',
      phone: testCitizenPhone,
      email: testCitizenEmail,
      rating: 4.8,
      is_verified: true,
    });

    await supabaseAdmin.from('user_roles').insert({
      user_id: citizenUserId,
      role: 'citizen',
    });

    await supabaseAdmin.from('citizen_profiles').insert({
      user_id: citizenUserId,
      eco_points_balance: 0,
      total_scrap_sold_kg: 0,
      total_earned_inr: 0,
    });

    // Sign in citizen with real Supabase Auth to get real JWT access token
    const { data: citLogin, error: citLoginErr } = await anonClient.auth.signInWithPassword({
      email: testCitizenEmail,
      password: testPassword,
    });
    if (citLoginErr) throw new Error(`Live Citizen sign-in failed: ${citLoginErr.message}`);
    citizenToken = citLogin.session.access_token;

    // 2. Create real collector in live Supabase Auth
    const { data: colAuth, error: colErr } = await supabaseAdmin.auth.admin.createUser({
      email: testCollectorEmail,
      phone: testCollectorPhone,
      password: testPassword,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { name: 'Live Collector Tester', role: 'collector' },
    });

    if (colErr) throw new Error(`Live Collector creation failed: ${colErr.message}`);
    collectorUserId = colAuth.user.id;

    // Insert collector profile & roles
    await supabaseAdmin.from('profiles').insert({
      id: collectorUserId,
      name: 'Live Collector Tester',
      phone: testCollectorPhone,
      email: testCollectorEmail,
      rating: 4.9,
      is_verified: true,
    });

    await supabaseAdmin.from('user_roles').insert({
      user_id: collectorUserId,
      role: 'collector',
    });

    await supabaseAdmin.from('collector_profiles').insert({
      user_id: collectorUserId,
      vehicle_number: 'DL 01 XY 9999',
      current_status: 'Active',
      is_available: true,
      current_latitude: 28.6139,
      current_longitude: 77.2090,
      eco_coins_balance: 0,
    });

    // Sign in collector with real Supabase Auth to get real JWT access token
    const { data: colLogin, error: colLoginErr } = await anonClient.auth.signInWithPassword({
      email: testCollectorEmail,
      password: testPassword,
    });
    if (colLoginErr) throw new Error(`Live Collector sign-in failed: ${colLoginErr.message}`);
    collectorToken = colLogin.session.access_token;
  });

  afterAll(async () => {
    // Clean up test users from live Supabase Auth
    if (citizenUserId) {
      await supabaseAdmin.auth.admin.deleteUser(citizenUserId);
    }
    if (collectorUserId) {
      await supabaseAdmin.auth.admin.deleteUser(collectorUserId);
    }
  });

  it('1. Live DB Schema: Verifies required tables and seeded catalog exist', async () => {
    const { data: categories, error: catErr } = await supabaseAdmin
      .from('scrap_categories')
      .select('name, slug')
      .eq('is_active', true);

    expect(catErr).toBeNull();
    expect(categories?.length).toBeGreaterThanOrEqual(6);

    const { data: rates, error: rateErr } = await supabaseAdmin
      .from('rate_cards')
      .select('sub_type, current_rate')
      .eq('is_active', true);

    expect(rateErr).toBeNull();
    expect(rates?.length).toBeGreaterThanOrEqual(11);
  });

  it('2. Live Supabase RLS: Anon client cannot read restricted profiles', async () => {
    const unauthenticatedClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: anonProfiles } = await unauthenticatedClient
      .from('profiles')
      .select('id, name, phone');

    // Due to RLS, anon user without auth session sees 0 rows
    expect(anonProfiles?.length).toBe(0);
  });

  it('3. Live Supabase RLS: Authenticated citizen sees only own profile', async () => {
    const citizenUserClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${citizenToken}` } },
    });

    const { data: profiles, error } = await citizenUserClient
      .from('profiles')
      .select('id, name, email');

    expect(error).toBeNull();
    expect(profiles?.length).toBe(1);
    expect(profiles?.[0]?.id).toBe(citizenUserId);
  });

  it('4. Live Supabase RLS: Non-admin citizen cannot read admin_audit_logs', async () => {
    const citizenUserClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${citizenToken}` } },
    });

    const { data: auditLogs, error } = await citizenUserClient
      .from('admin_audit_logs')
      .select('*');

    // RLS policy prevents non-admins from viewing audit logs
    expect(auditLogs?.length).toBe(0);
  });

  it('5. Live Auth & Profile Endpoint: /api/v1/users/me with real Supabase JWT', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(citizenUserId);
    expect(res.body.data.name).toBe('Live Citizen Tester');
    expect(res.body.data.role).toBe('citizen');
  });

  it('6. Live Scrap Rates: /api/v1/scrap/rates fetched directly from live DB', async () => {
    const res = await request(app).get('/api/v1/scrap/rates');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(6);
  });

  it('7. Live Pickup Creation: Inserts real row into live pickup_requests table', async () => {
    const res = await request(app)
      .post('/api/v1/pickups')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        scheduledDate: '2026-09-25',
        timeSlot: '10:00 AM - 12:00 PM',
        address: 'Sector 62, Noida, Uttar Pradesh',
        collectorId: collectorUserId,
        latitude: 28.6139,
        longitude: 77.2090,
        instructions: 'Live integration test pickup',
        items: [
          {
            category: 'Plastic',
            subType: 'PET Bottles & Containers',
            weightKg: 10.0,
            pricePerKg: 50.0,
            estimatedPrice: 500.0,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    livePickupId = res.body.data.id;
    liveOtpCode = res.body.data.otpCode;

    // Verify row physically exists in live Supabase table
    const { data: dbRow, error } = await supabaseAdmin
      .from('pickup_requests')
      .select('*')
      .eq('id', livePickupId)
      .single();

    expect(error).toBeNull();
    expect(dbRow.id).toBe(livePickupId);
    expect(dbRow.citizen_id).toBe(citizenUserId);
  });

  it('8. Live State Transitions: Collector advances pickup (accepted -> onTheWay -> arrived)', async () => {
    // Move to onTheWay
    const onWayRes = await request(app)
      .patch(`/api/v1/pickups/${livePickupId}/status`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({ status: 'onTheWay' });

    expect(onWayRes.status).toBe(200);
    expect(onWayRes.body.data.status).toBe('onTheWay');

    // Move to arrived
    const arrivedRes = await request(app)
      .patch(`/api/v1/pickups/${livePickupId}/status`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({ status: 'arrived' });

    expect(arrivedRes.status).toBe(200);
    expect(arrivedRes.body.data.status).toBe('arrived');
  });

  it('9. Live Pickup Verification: Collector enters OTP and scale weight on live DB', async () => {
    const verifyRes = await request(app)
      .post(`/api/v1/pickups/${livePickupId}/verify`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({
        otpCode: liveOtpCode,
        finalWeight: 10.5,
        finalAmount: 525.0, // Bill >= 500, qualifies for citizen Eco Points!
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe('verified');
    expect(verifyRes.body.data.finalVerifiedPrice).toBe(525.0);
  });

  it('10. Live Database State Machine Trigger: Direct SQL rejection of illegal transition', async () => {
    // Directly attempt illegal backward transition (verified -> pending) on live Supabase table
    const { error } = await supabaseAdmin
      .from('pickup_requests')
      .update({ status: 'pending' })
      .eq('id', livePickupId);

    // The PostgreSQL trigger trg_validate_pickup_transition MUST reject this!
    expect(error).not.toBeNull();
    expect(error?.message).toContain('Invalid pickup state transition');
  });

  it('11. Live Payment & Rewards: Verifies payment, marks completed, credits live ledger', async () => {
    // 1. Create order
    const orderRes = await request(app)
      .post('/api/v1/payments/create')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ pickupId: livePickupId });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.orderId).toBeDefined();

    // 2. Verify payment (Mock payment provider simulates gateway success)
    const verifyPayRes = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        pickupId: livePickupId,
        orderId: orderRes.body.data.orderId,
        paymentId: `pay_live_test_${Date.now()}`,
        signature: 'mock_sig_live_test',
      });

    expect(verifyPayRes.status).toBe(200);
    expect(verifyPayRes.body.data.status).toBe('SUCCESS');
    expect(verifyPayRes.body.data.ecoPointsEarned).toBe(52); // 10% of ₹525 = 52 points

    // 3. Verify real record exists in live payments table
    const { data: dbPayment } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('pickup_id', livePickupId)
      .single();

    expect(dbPayment).toBeDefined();
    expect(parseFloat(dbPayment.amount)).toBe(525.0);

    // 4. Verify real entry in live reward_transactions table
    const { data: citizenRewardTx } = await supabaseAdmin
      .from('reward_transactions')
      .select('*')
      .eq('user_id', citizenUserId)
      .eq('reference_id', livePickupId)
      .single();

    expect(citizenRewardTx).toBeDefined();
    expect(citizenRewardTx.amount).toBe(52);
    expect(citizenRewardTx.type).toBe('earned');

    // 5. Verify citizen profile cached points balance was updated in live DB
    const { data: updatedCitProfile } = await supabaseAdmin
      .from('citizen_profiles')
      .select('eco_points_balance')
      .eq('user_id', citizenUserId)
      .single();

    expect(updatedCitProfile.eco_points_balance).toBe(52);
  });

  it('12. Live Recycling Journey: Queries journey for completed pickup', async () => {
    const res = await request(app)
      .get(`/api/v1/recycling/pickup/${livePickupId}`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pickupId).toBe(livePickupId);
    expect(Array.isArray(res.body.data.steps)).toBe(true);
  });

  it('13. Live Auth: loginWithPhone returns valid real Supabase JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: testCitizenPhone, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.token.length).toBeGreaterThan(50); // Real Supabase JWT

    // Test that the returned token works on authenticated endpoint
    const meRes = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${res.body.data.token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.id).toBe(citizenUserId);
  });

  it('14. Live Security: Missing JWT returns 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('15. Live Security: Expired or malformed JWT returns 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer invalid.expired.fakejwttoken');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('16. Live Security: Citizen JWT cannot access collector-only operations (403)', async () => {
    const res = await request(app)
      .patch('/api/v1/collectors/status')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ status: 'Active', isAvailable: true });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('17. Live Security: Citizen JWT cannot access admin-only operations (403)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('18. Live Security: Collector JWT cannot access admin-only operations (403)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${collectorToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

