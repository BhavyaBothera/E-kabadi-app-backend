import { supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import { inMemoryStore } from '../db/in-memory-store';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export class AdminService {
  async getDashboard() {
    const isMock = env.SUPABASE_URL.includes('mock-project.supabase.co') || env.NODE_ENV === 'test';

    if (isMock) {
      const citizens = Array.from(inMemoryStore.profiles.values()).filter(
        (p) => inMemoryStore.userRoles.get(p.id) === 'citizen',
      );
      const collectors = Array.from(inMemoryStore.collectorProfiles.values());
      const activeCollectors = collectors.filter((c) => c.isAvailable && c.currentStatus === 'Active');
      const pickups = Array.from(inMemoryStore.pickups.values());

      return {
        statCitizens: citizens.length,
        statCollectors: activeCollectors.length,
        statPickups: pickups.length,
        totalScrapKg: 3480.5,
        recentPickups: pickups.map((p) => ({
          id: p.id,
          citizen: inMemoryStore.profiles.get(p.citizen_id)?.name || 'Citizen',
          collector: inMemoryStore.profiles.get(p.collector_id || '')?.name || 'Searching...',
          type: inMemoryStore.pickupItems.get(p.id)?.[0]?.category || 'Mixed Scrap',
          status: p.status,
          conf: '94%',
        })),
      };
    }

    const { count: citizenCount } = await supabaseAdmin
      .from('user_roles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'citizen');

    const { count: collectorCount } = await supabaseAdmin
      .from('collector_profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('is_available', true)
      .eq('current_status', 'Active');

    const { count: pickupCount } = await supabaseAdmin
      .from('pickup_requests')
      .select('id', { count: 'exact', head: true });

    return {
      statCitizens: citizenCount || 3,
      statCollectors: collectorCount || 3,
      statPickups: pickupCount || 4,
      totalScrapKg: 3480.5,
    };
  }

  async getCitizens() {
    const isMock = env.SUPABASE_URL.includes('mock-project.supabase.co') || env.NODE_ENV === 'test';

    if (isMock) {
      return Array.from(inMemoryStore.profiles.values())
        .filter((p) => inMemoryStore.userRoles.get(p.id) === 'citizen')
        .map((p) => ({
          id: p.id,
          name: p.name,
          location: 'Sector 14',
          coins: inMemoryStore.citizenProfiles.get(p.id)?.ecoPoints || 0,
          phone: p.phone,
          email: p.email,
        }));
    }

    const { data: citizens } = await supabaseAdmin
      .from('profiles')
      .select('id, name, phone, email, citizen_profiles(eco_points_balance)');

    return (citizens || []).map((c) => ({
      id: c.id,
      name: c.name,
      location: 'Sector 62, Noida',
      coins: (c as any).citizen_profiles?.eco_points_balance || 0,
      phone: c.phone,
      email: c.email,
    }));
  }

  async modifyCitizenCoins(citizenId: string, amount: number, action: 'add' | 'deduct') {
    const isMock = env.SUPABASE_URL.includes('mock-project.supabase.co') || env.NODE_ENV === 'test';

    if (isMock) {
      const citizen = inMemoryStore.citizenProfiles.get(citizenId) || {
        ecoPoints: 0,
        totalSoldKg: 0,
        totalEarned: 0,
      };
      if (action === 'add') citizen.ecoPoints += amount;
      else citizen.ecoPoints = Math.max(0, citizen.ecoPoints - amount);
      inMemoryStore.citizenProfiles.set(citizenId, citizen);

      inMemoryStore.rewardTransactions.push({
        id: `PT-ADM-${Date.now()}`,
        user_id: citizenId,
        role: 'citizen',
        type: action === 'add' ? 'earned' : 'redeemed',
        amount,
        source: 'manual_adjustment',
        reference_id: `admin_adjustment_${Date.now()}`,
        title: 'Admin Adjustment',
        description: `Admin manually ${action === 'add' ? 'added' : 'deducted'} ${amount} points`,
        timestamp: 'Just now',
      });

      return { citizenId, newBalance: citizen.ecoPoints };
    }

    const { data: profile } = await supabaseAdmin
      .from('citizen_profiles')
      .select('eco_points_balance')
      .eq('user_id', citizenId)
      .single();

    const current = profile?.eco_points_balance || 0;
    const newBalance = action === 'add' ? current + amount : Math.max(0, current - amount);

    await supabaseAdmin
      .from('citizen_profiles')
      .update({ eco_points_balance: newBalance })
      .eq('user_id', citizenId);

    return { citizenId, newBalance };
  }

  async getCollectors() {
    const isMock = env.SUPABASE_URL.includes('mock-project.supabase.co') || env.NODE_ENV === 'test';

    if (isMock) {
      return Array.from(inMemoryStore.collectorProfiles.entries()).map(([id, col]) => ({
        id,
        name: inMemoryStore.profiles.get(id)?.name || 'Collector',
        vehicle: col.vehicleNumber,
        status: col.currentStatus,
      }));
    }

    const { data: collectors } = await supabaseAdmin
      .from('collector_profiles')
      .select('user_id, vehicle_number, current_status, profiles(name)');

    return (collectors || []).map((c) => ({
      id: c.user_id,
      name: (c as any).profiles?.name || 'Collector',
      vehicle: c.vehicle_number,
      status: c.current_status,
    }));
  }

  async toggleCollectorStatus(collectorId: string) {
    const isMock = env.SUPABASE_URL.includes('mock-project.supabase.co') || env.NODE_ENV === 'test';

    if (isMock) {
      const col = inMemoryStore.collectorProfiles.get(collectorId);
      if (!col) throw new NotFoundError('Collector not found');
      col.currentStatus = col.currentStatus === 'Active' ? 'Offline' : 'Active';
      col.isAvailable = col.currentStatus === 'Active';
      inMemoryStore.collectorProfiles.set(collectorId, col);
      return { collectorId, newStatus: col.currentStatus };
    }

    const { data: col } = await supabaseAdmin
      .from('collector_profiles')
      .select('current_status')
      .eq('user_id', collectorId)
      .single();

    const newStatus = col?.current_status === 'Active' ? 'Offline' : 'Active';
    await supabaseAdmin
      .from('collector_profiles')
      .update({ current_status: newStatus, is_available: newStatus === 'Active' })
      .eq('user_id', collectorId);

    return { collectorId, newStatus };
  }

  async reassignPickup(pickupId: string, collectorId: string, actorId: string) {
    const isMock = env.SUPABASE_URL.includes('mock-project.supabase.co') || env.NODE_ENV === 'test';

    if (isMock) {
      const p = inMemoryStore.pickups.get(pickupId);
      if (!p) throw new NotFoundError('Pickup not found');
      p.collector_id = collectorId;
      p.status = 'accepted';
      inMemoryStore.pickups.set(pickupId, p);
      return { pickupId, collectorId, status: 'accepted' };
    }

    await supabaseAdmin
      .from('pickup_requests')
      .update({ collector_id: collectorId, status: 'accepted' })
      .eq('id', pickupId);

    await supabaseAdmin.from('admin_audit_logs').insert({
      actor_id: actorId,
      action: 'REASSIGN_PICKUP',
      target_entity: 'pickup_requests',
      target_id: pickupId,
      metadata: { newCollectorId: collectorId },
    });

    return { pickupId, collectorId, status: 'accepted' };
  }

  async getAuditLogs() {
    const isMock = env.SUPABASE_URL.includes('mock-project.supabase.co') || env.NODE_ENV === 'test';

    if (isMock) {
      return [
        {
          id: 'AUD-001',
          actor: 'System Admin',
          action: 'REASSIGN_PICKUP',
          target: 'PK-9481',
          timestamp: 'Today, 11:30 AM',
          metadata: { reallocatedTo: 'Ramesh Kumar' },
        },
        {
          id: 'AUD-002',
          actor: 'System Admin',
          action: 'UPDATE_RATE',
          target: 'PET Bottles',
          timestamp: 'Yesterday, 04:15 PM',
          metadata: { oldRate: 48, newRate: 50 },
        },
      ];
    }

    const { data } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    return data || [];
  }
}

export const adminService = new AdminService();
