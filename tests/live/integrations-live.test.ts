import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import request from 'supertest';
import app from '../../src/app';
import { env } from '../../src/config/env';
import { supabaseAdmin } from '../../src/config/supabase';
import { storageService } from '../../src/services/storage.service';
import { RazorpayProvider } from '../../src/integrations/payments/providers/razorpay.provider';

// Explicitly set LIVE_DB for this test suite
process.env.LIVE_DB = 'true';

describe('LIVE THIRD-PARTY INTEGRATIONS: RAZORPAY + GEMINI/AI + SUPABASE STORAGE', () => {
  const anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

  const testCitizenEmail = `live_int_cit_${Date.now()}@ekabadi.test`;
  const testCitizenPhone = `+9197${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testCollectorEmail = `live_int_col_${Date.now()}@ekabadi.test`;
  const testCollectorPhone = `+9196${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testPassword = 'Password123!';

  let citizenUserId: string;
  let citizenToken: string;
  let collectorUserId: string;
  let collectorToken: string;

  // Real sample 1x1 transparent/valid base64 JPEG
  const sampleBase64Jpeg =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  let uploadedStoragePath: string;

  beforeAll(async () => {
    // 1. Create real citizen
    const { data: citAuth, error: citErr } = await supabaseAdmin.auth.admin.createUser({
      email: testCitizenEmail,
      phone: testCitizenPhone,
      password: testPassword,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { name: 'Integration Citizen', role: 'citizen' },
    });
    if (citErr) throw new Error(`Citizen creation failed: ${citErr.message}`);
    citizenUserId = citAuth.user.id;

    await supabaseAdmin.from('profiles').insert({
      id: citizenUserId,
      name: 'Integration Citizen',
      phone: testCitizenPhone,
      email: testCitizenEmail,
      rating: 4.9,
      is_verified: true,
    });
    await supabaseAdmin.from('user_roles').insert({ user_id: citizenUserId, role: 'citizen' });
    await supabaseAdmin.from('citizen_profiles').insert({
      user_id: citizenUserId,
      eco_points_balance: 0,
      total_scrap_sold_kg: 0,
    });

    const { data: citLogin, error: citLoginErr } = await anonClient.auth.signInWithPassword({
      email: testCitizenEmail,
      password: testPassword,
    });
    if (citLoginErr) throw new Error(`Citizen login failed: ${citLoginErr.message}`);
    citizenToken = citLogin.session!.access_token;

    // 2. Create real collector
    const { data: colAuth, error: colErr } = await supabaseAdmin.auth.admin.createUser({
      email: testCollectorEmail,
      phone: testCollectorPhone,
      password: testPassword,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { name: 'Integration Collector', role: 'collector' },
    });
    if (colErr) throw new Error(`Collector creation failed: ${colErr.message}`);
    collectorUserId = colAuth.user.id;

    await supabaseAdmin.from('profiles').insert({
      id: collectorUserId,
      name: 'Integration Collector',
      phone: testCollectorPhone,
      email: testCollectorEmail,
      rating: 4.8,
      is_verified: true,
    });
    await supabaseAdmin.from('user_roles').insert({ user_id: collectorUserId, role: 'collector' });
    await supabaseAdmin.from('collector_profiles').insert({
      user_id: collectorUserId,
      vehicle_type: 'Electric Three Wheeler',
      vehicle_number: 'DL-01-EK-7777',
      is_available: true,
      eco_coins_balance: 0,
      service_pincodes: ['110001', '110002'],
    });

    const { data: colLogin, error: colLoginErr } = await anonClient.auth.signInWithPassword({
      email: testCollectorEmail,
      password: testPassword,
    });
    if (colLoginErr) throw new Error(`Collector login failed: ${colLoginErr.message}`);
    collectorToken = colLogin.session!.access_token;
  }, 35000);

  afterAll(async () => {
    if (uploadedStoragePath) {
      await storageService.deleteImage(uploadedStoragePath);
    }
    if (citizenUserId) {
      await supabaseAdmin.auth.admin.deleteUser(citizenUserId);
    }
    if (collectorUserId) {
      await supabaseAdmin.auth.admin.deleteUser(collectorUserId);
    }
  });

  // ============================================================================
  // 1. SUPABASE STORAGE INTEGRATION
  // ============================================================================
  it('1. Supabase Storage: Bucket verification & direct image upload', async () => {
    await storageService.ensureBucket();

    const upload = await storageService.uploadScrapImage(sampleBase64Jpeg, citizenUserId);
    expect(upload).toBeDefined();
    expect(upload.storagePath).toContain(citizenUserId);
    expect(upload.storagePath).toMatch(/\.jpg$/);
    expect(upload.signedUrl).toContain('http');
    uploadedStoragePath = upload.storagePath;

    // Verify signed URL generation
    const freshSignedUrl = await storageService.getSignedUrl(upload.storagePath);
    expect(freshSignedUrl).toBeDefined();
    expect(freshSignedUrl).toContain(upload.storagePath);
  });

  it('2. Supabase Storage API: GET /api/v1/storage/image retrieves signed URL with auth', async () => {
    // Unauthenticated request rejected
    const unauthRes = await request(app).get(`/api/v1/storage/image?path=${uploadedStoragePath}`);
    expect(unauthRes.status).toBe(401);

    // Authenticated request succeeds
    const authRes = await request(app)
      .get(`/api/v1/storage/image?path=${uploadedStoragePath}`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(authRes.status).toBe(200);
    expect(authRes.body.success).toBe(true);
    expect(authRes.body.data.signedUrl).toBeDefined();
    expect(authRes.body.data.storagePath).toBe(uploadedStoragePath);
  });

  // ============================================================================
  // 2. AI SCRAP ANALYSIS + STORAGE CHAIN
  // ============================================================================
  it('3. AI Scrap Analysis: Stores image reference in PostgreSQL and returns detected materials', async () => {
    const res = await request(app)
      .post('/api/v1/scrap/analyze')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        image: sampleBase64Jpeg,
        isFromCamera: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const firstItem = res.body.data[0];
    expect(firstItem.category).toBeDefined();
    expect(firstItem.confidenceScore).toBeGreaterThan(0);
    expect(firstItem.pricePerKg).toBeGreaterThan(0);

    // Verify storage reference attached
    expect(firstItem.storagePath).toBeDefined();
    expect(firstItem.imageUrl).toBeDefined();

    // Verify record in PostgreSQL scrap_analyses table
    const { data: dbRecords } = await supabaseAdmin
      .from('scrap_analyses')
      .select('*')
      .eq('user_id', citizenUserId)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(dbRecords).toBeDefined();
    expect(dbRecords!.length).toBe(1);
    expect(dbRecords![0].image_url).toBe(firstItem.storagePath);
    expect(dbRecords![0].is_from_camera).toBe(true);
  });

  // ============================================================================
  // 3. RAZORPAY PAYMENT PROVIDER (SIGNATURE VERIFICATION & REJECTION)
  // ============================================================================
  it('4. Razorpay Provider: Validates HMAC-SHA256 signature and rejects fraudulent attempts', async () => {
    const testSecret = 'rzp_test_secret_key_84920';
    const razorpay = new RazorpayProvider('rzp_test_keyId_123', testSecret);

    const orderId = 'order_test_98412';
    const paymentId = 'pay_test_39182';

    // 1. Generate real HMAC-SHA256 signature
    const validSignature = crypto
      .createHmac('sha256', testSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const verifiedResult = await razorpay.verifyPayment({
      pickupId: 'PK-TEST-1',
      orderId,
      paymentId,
      signature: validSignature,
    });

    expect(verifiedResult.isVerified).toBe(true);
    expect(verifiedResult.transactionId).toBe(paymentId);

    // 2. Reject mismatched signature
    await expect(
      razorpay.verifyPayment({
        pickupId: 'PK-TEST-1',
        orderId,
        paymentId,
        signature: 'fake_tampered_signature_hex',
      }),
    ).rejects.toThrow('Invalid payment signature');

    // 3. Reject missing signature
    await expect(
      razorpay.verifyPayment({
        pickupId: 'PK-TEST-1',
        orderId,
        paymentId,
      }),
    ).rejects.toThrow('Missing Razorpay payment signature');
  });

  // ============================================================================
  // 4. FULL END-TO-END CHAIN ON LIVE DATABASE
  // ============================================================================
  it('5. Full E2E Chain: Scrap Image → Storage → Analysis → Pickup → Verification → Payment → Rewards → Journey', async () => {
    // Step A: Image analyzed & storage reference created
    const aiRes = await request(app)
      .post('/api/v1/scrap/analyze')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        image: sampleBase64Jpeg,
        isFromCamera: true,
      });
    expect(aiRes.status).toBe(200);

    // Step B: Citizen creates pickup
    const pickupRes = await request(app)
      .post('/api/v1/pickups')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        items: [
          {
            category: 'Metal & Aluminium',
            subType: 'Beverage Cans',
            weightKg: 10.0,
            pricePerKg: 65.0,
            estimatedTotal: 650.0,
          },
        ],
        scheduledDate: '2026-09-25',
        timeSlot: '11:00 AM - 01:00 PM',
        address: '404 Connaught Place, New Delhi 110001',
        collectorId: collectorUserId,
      });

    expect(pickupRes.status).toBe(201);
    const pickupId = pickupRes.body.data.id;
    const otpCode = pickupRes.body.data.otpCode;
    expect(otpCode).toMatch(/^\d{4}$/);

    // Step C: Collector advances pickup (auto-assigned pickups start at accepted)
    if (pickupRes.body.data.status === 'pending') {
      const acceptRes = await request(app)
        .patch(`/api/v1/pickups/${pickupId}/status`)
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({ status: 'accepted' });
      expect(acceptRes.status).toBe(200);
    }

    await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({ status: 'onTheWay' });

    await request(app)
      .patch(`/api/v1/pickups/${pickupId}/status`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({ status: 'arrived' });

    // Step D: Collector verifies with OTP + physical scale weight
    const verifyRes = await request(app)
      .post(`/api/v1/pickups/${pickupId}/verify`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({
        otpCode,
        finalWeight: 10.5,
        finalAmount: 680.0,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe('verified');

    // Step E: Create payment order
    const orderRes = await request(app)
      .post('/api/v1/payments/create')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ pickupId });

    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data.orderId;

    // Step F: Complete payment verification (authoritative)
    const payVerifyRes = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        pickupId,
        orderId,
        paymentId: `pay_live_${Date.now()}`,
        method: 'UPI / Razorpay Verified',
      });

    expect(payVerifyRes.status).toBe(200);
    expect(payVerifyRes.body.data.status).toBe('SUCCESS');
    expect(payVerifyRes.body.data.amount).toBe(680.0);

    // ₹680 is >= ₹500 threshold, awards 10% = 68 points
    expect(payVerifyRes.body.data.ecoPointsEarned).toBe(68);

    // Step G: Verify Rewards in Live Database
    const { data: citProfile } = await supabaseAdmin
      .from('citizen_profiles')
      .select('eco_points_balance')
      .eq('user_id', citizenUserId)
      .single();

    expect(citProfile?.eco_points_balance).toBe(68);

    // Step H: Verify 4-step Recycling Journey
    const journeyRes = await request(app)
      .get(`/api/v1/recycling/pickup/${pickupId}`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(journeyRes.status).toBe(200);
    expect(journeyRes.body.data.steps.length).toBeGreaterThanOrEqual(3);
    expect(journeyRes.body.data.steps[0].title).toBe('Scrap Collected');
    expect(journeyRes.body.data.steps[0].isCompleted).toBe(true);
  }, 45000);
});
