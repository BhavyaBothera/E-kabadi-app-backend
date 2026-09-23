/**
 * Test Data Cleanup Utility
 * Removes stale test users (matching *@ekabadi.test) and their associated
 * records from the live Supabase database.
 *
 * Usage: npx tsx scripts/cleanup-test-data.ts
 *
 * SAFETY: Only deletes records matching the @ekabadi.test email pattern.
 * Real user data is never touched.
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TEST_EMAIL_PATTERN = '@ekabadi.test';

async function cleanup(): Promise<void> {
  console.log('🧹 E-Kabadi Test Data Cleanup');
  console.log(`   Supabase: ${SUPABASE_URL}`);
  console.log(`   Pattern: *${TEST_EMAIL_PATTERN}\n`);

  // 1. Find all test users in auth
  const { data: authUsers, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    console.error(`❌ Failed to list auth users: ${listErr.message}`);
    process.exit(1);
  }

  const testUsers = authUsers.users.filter(
    (u) => u.email?.endsWith(TEST_EMAIL_PATTERN),
  );

  console.log(`   Found ${testUsers.length} test user(s) in Supabase Auth.\n`);

  if (testUsers.length === 0) {
    console.log('✅ No stale test data to clean up.');
    return;
  }

  const testUserIds = testUsers.map((u) => u.id);

  // 2. Collect pickup IDs associated with test users (as citizen or collector)
  const { data: pickupsByCitizen } = await supabase
    .from('pickup_requests')
    .select('id')
    .in('citizen_id', testUserIds);
  const { data: pickupsByCollector } = await supabase
    .from('pickup_requests')
    .select('id')
    .in('collector_id', testUserIds);

  const pickupIdSet = new Set<string>();
  pickupsByCitizen?.forEach((p) => pickupIdSet.add(p.id));
  pickupsByCollector?.forEach((p) => pickupIdSet.add(p.id));
  const pickupIds = Array.from(pickupIdSet);

  // Collect recycling journey IDs for these pickups
  let journeyIds: string[] = [];
  if (pickupIds.length > 0) {
    const { data: journeys } = await supabase
      .from('recycling_journeys')
      .select('id')
      .in('pickup_id', pickupIds);
    journeyIds = (journeys || []).map((j) => j.id);
  }

  // Collect payment IDs for these pickups or test users
  let paymentIds: string[] = [];
  if (pickupIds.length > 0) {
    const { data: payments } = await supabase
      .from('payments')
      .select('id')
      .in('pickup_id', pickupIds);
    paymentIds = (payments || []).map((p) => p.id);
  }

  // 3. Delete dependent records in strict FK order
  const stepActions = [
    {
      name: 'recycling_journey_steps',
      action: async () => {
        if (journeyIds.length > 0) {
          return supabase.from('recycling_journey_steps').delete().in('journey_id', journeyIds);
        }
      },
    },
    {
      name: 'recycling_journeys',
      action: async () => {
        if (pickupIds.length > 0) {
          return supabase.from('recycling_journeys').delete().in('pickup_id', pickupIds);
        }
      },
    },
    {
      name: 'payment_events',
      action: async () => {
        if (paymentIds.length > 0) {
          return supabase.from('payment_events').delete().in('payment_id', paymentIds);
        }
      },
    },
    {
      name: 'payments',
      action: async () => {
        if (pickupIds.length > 0) {
          return supabase.from('payments').delete().in('pickup_id', pickupIds);
        }
      },
    },
    {
      name: 'pickup_items',
      action: async () => {
        if (pickupIds.length > 0) {
          return supabase.from('pickup_items').delete().in('pickup_id', pickupIds);
        }
      },
    },
    {
      name: 'pickup_status_history',
      action: async () => {
        if (pickupIds.length > 0) {
          return supabase.from('pickup_status_history').delete().in('pickup_id', pickupIds);
        }
      },
    },
    {
      name: 'collector_assignments',
      action: async () => {
        if (pickupIds.length > 0) {
          return supabase.from('collector_assignments').delete().in('pickup_id', pickupIds);
        }
      },
    },
    {
      name: 'reward_transactions',
      action: async () => supabase.from('reward_transactions').delete().in('user_id', testUserIds),
    },
    {
      name: 'reward_redemptions',
      action: async () => supabase.from('reward_redemptions').delete().in('user_id', testUserIds),
    },
    {
      name: 'pickup_requests',
      action: async () => {
        if (pickupIds.length > 0) {
          return supabase.from('pickup_requests').delete().in('id', pickupIds);
        }
      },
    },
    {
      name: 'scrap_analyses',
      action: async () => supabase.from('scrap_analyses').delete().in('user_id', testUserIds),
    },
    {
      name: 'notifications',
      action: async () => supabase.from('notifications').delete().in('user_id', testUserIds),
    },
    {
      name: 'addresses',
      action: async () => supabase.from('addresses').delete().in('user_id', testUserIds),
    },
    {
      name: 'collector_profiles',
      action: async () => supabase.from('collector_profiles').delete().in('user_id', testUserIds),
    },
    {
      name: 'citizen_profiles',
      action: async () => supabase.from('citizen_profiles').delete().in('user_id', testUserIds),
    },
    {
      name: 'user_roles',
      action: async () => supabase.from('user_roles').delete().in('user_id', testUserIds),
    },
    {
      name: 'profiles',
      action: async () => supabase.from('profiles').delete().in('id', testUserIds),
    },
  ];

  for (const step of stepActions) {
    try {
      const result = await step.action();
      if (result?.error) {
        console.log(`   ⚠️  ${step.name}: ${result.error.message}`);
      } else {
        console.log(`   ✓ ${step.name}: cleaned`);
      }
    } catch (err) {
      console.log(`   ⚠️  ${step.name}: skipped (${(err as Error).message})`);
    }
  }

  // 3. Delete auth users
  let deletedCount = 0;
  for (const user of testUsers) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.log(`   ⚠️  Auth user ${user.email}: ${delErr.message}`);
    } else {
      deletedCount++;
    }
  }

  console.log(`\n✅ Cleanup complete:`);
  console.log(`   Auth users deleted: ${deletedCount}/${testUsers.length}`);
  console.log(`   Pickup records cleaned: ${pickupIds.length}`);
}

cleanup().catch((err) => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
