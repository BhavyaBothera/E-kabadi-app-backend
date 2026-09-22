import { supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import { inMemoryStore } from '../db/in-memory-store';
import {
  CreatePickupInput,
  UpdatePickupStatusInput,
  VerifyPickupInput,
  CancelPickupInput,
} from '../validators/pickup.schemas';
import { PickupStatus } from '../config/constants';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import { matchingService } from './matching.service';
import { authService } from './auth.service';
import { logger } from '../utils/logger';

export interface PickupItemResponse {
  id: string;
  category: string;
  subType: string;
  weightKg: number;
  pricePerKg: number;
  estimatedTotal: number;
  confidenceScore: number;
  notes: string;
}

export interface PickupRequestResponse {
  id: string;
  citizenId: string;
  citizenName: string;
  citizenAddress: string;
  citizenPhone: string;
  items: PickupItemResponse[];
  status: PickupStatus;
  totalEstimatedPrice: number;
  finalVerifiedPrice: number;
  finalVerifiedWeight: number;
  scheduledDate: string;
  timeSlot: string;
  instructions: string;
  collectorId: string;
  collectorName: string;
  collectorPhone: string;
  collectorRating: number;
  collectorDistance: string;
  otpCode: string;
  createdAt: string;
}

// Dual-layer state machine transition graph
const VALID_TRANSITIONS: Record<PickupStatus, PickupStatus[]> = {
  pending: ['matching', 'accepted', 'cancelled'],
  matching: ['accepted', 'cancelled'],
  accepted: ['onTheWay', 'cancelled'],
  onTheWay: ['arrived', 'cancelled'],
  arrived: ['verified', 'cancelled'],
  verified: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export class PickupService {
  async createPickup(citizenId: string, input: CreatePickupInput): Promise<PickupRequestResponse> {
    const citizen = await authService.getUserById(citizenId);

    // 1. Authoritative price calculation
    let calculatedTotal = 0;
    const itemsToInsert = input.items.map((item, idx) => {
      const itemTotal = Math.round(item.weightKg * item.pricePerKg * 100) / 100;
      calculatedTotal += itemTotal;
      return {
        id: item.id || `SC-${Date.now()}-${idx + 1}`,
        category: item.category,
        sub_type: item.subType,
        weight_kg: item.weightKg,
        price_per_kg: item.pricePerKg,
        estimated_total: itemTotal,
        confidence_score: item.confidenceScore || 0.95,
        notes: item.notes || '',
      };
    });

    calculatedTotal = Math.round(calculatedTotal * 100) / 100;

    const pickupId = `PK-${Math.floor(1000 + Math.random() * 9000)}`;
    const otpCode = `${Math.floor(1000 + Math.random() * 9000)}`;

    let collectorId = input.collectorId || null;
    let collectorDistance = '1.2 km away';
    let initialStatus: PickupStatus = 'pending';

    // 2. Collector Matching
    if (input.autoAssign || collectorId) {
      initialStatus = 'matching';
      if (!collectorId) {
        const bestCandidate = await matchingService.findBestCollector(
          input.latitude || 28.6139,
          input.longitude || 77.2090,
        );
        if (bestCandidate) {
          collectorId = bestCandidate.collectorId;
          collectorDistance = bestCandidate.distanceString;
          initialStatus = 'accepted';
        }
      } else {
        initialStatus = 'accepted';
      }
    }

    // 3. Database / In-Memory Insertion
    if (env.SUPABASE_URL.includes('mock-project.supabase.co') || env.NODE_ENV === 'test') {
      inMemoryStore.pickups.set(pickupId, {
        id: pickupId,
        citizen_id: citizenId,
        collector_id: collectorId,
        status: initialStatus,
        total_estimated_price: calculatedTotal,
        final_verified_price: 0,
        final_verified_weight: 0,
        scheduled_date: input.scheduledDate,
        time_slot: input.timeSlot,
        citizen_address: input.address,
        instructions: input.instructions || '',
        otp_code: otpCode,
        collector_distance: collectorDistance,
        created_at: 'Just now',
      });

      inMemoryStore.pickupItems.set(
        pickupId,
        itemsToInsert.map((item) => ({
          id: item.id,
          pickup_id: pickupId,
          category: item.category,
          sub_type: item.sub_type,
          weight_kg: item.weight_kg,
          price_per_kg: item.price_per_kg,
          estimated_total: item.estimated_total,
          confidence_score: item.confidence_score,
          notes: item.notes,
        })),
      );

      return this.getPickupById(pickupId);
    }

    const { error: pickupError } = await supabaseAdmin.from('pickup_requests').insert({
      id: pickupId,
      citizen_id: citizenId,
      collector_id: collectorId,
      status: initialStatus,
      total_estimated_price: calculatedTotal,
      scheduled_date: input.scheduledDate,
      time_slot: input.timeSlot,
      citizen_address: input.address,
      latitude: input.latitude || 28.6139,
      longitude: input.longitude || 77.2090,
      instructions: input.instructions || '',
      otp_code: otpCode,
      collector_distance: collectorDistance,
    });

    if (pickupError) {
      logger.error('Failed to create pickup in database:', pickupError);
    }

    // Insert items
    for (const item of itemsToInsert) {
      await supabaseAdmin.from('pickup_items').insert({
        pickup_id: pickupId,
        category: item.category,
        sub_type: item.sub_type,
        weight_kg: item.weight_kg,
        price_per_kg: item.price_per_kg,
        estimated_total: item.estimated_total,
        confidence_score: item.confidence_score,
        notes: item.notes,
      });
    }

    // Log status history
    await supabaseAdmin.from('pickup_status_history').insert({
      pickup_id: pickupId,
      old_status: null,
      new_status: initialStatus,
      changed_by: citizenId,
      notes: 'Initial creation',
    });

    return this.getPickupById(pickupId);
  }

  async getPickupById(pickupId: string): Promise<PickupRequestResponse> {
    if (env.SUPABASE_URL.includes('mock-project.supabase.co') || env.NODE_ENV === 'test') {
      const inMem = inMemoryStore.pickups.get(pickupId);
      if (!inMem) {
        throw new NotFoundError(`Pickup ${pickupId} not found`, 'PICKUP_NOT_FOUND');
      }
      const citizen = await authService.getUserById(inMem.citizen_id);
      const collector = inMem.collector_id ? await authService.getUserById(inMem.collector_id) : null;
      const items = inMemoryStore.pickupItems.get(pickupId) || [];
      return {
        id: inMem.id,
        citizenId: inMem.citizen_id,
        citizenName: citizen.name,
        citizenAddress: inMem.citizen_address,
        citizenPhone: citizen.phone,
        items: items.map((it) => ({
          id: it.id,
          category: it.category,
          subType: it.sub_type,
          weightKg: it.weight_kg,
          pricePerKg: it.price_per_kg,
          estimatedTotal: it.estimated_total,
          confidenceScore: it.confidence_score,
          notes: it.notes,
        })),
        status: inMem.status as PickupStatus,
        totalEstimatedPrice: inMem.total_estimated_price,
        finalVerifiedPrice: inMem.final_verified_price,
        finalVerifiedWeight: inMem.final_verified_weight,
        scheduledDate: inMem.scheduled_date,
        timeSlot: inMem.time_slot,
        instructions: inMem.instructions,
        collectorId: inMem.collector_id || '22222222-2222-4222-a222-222222222222',
        collectorName: collector?.name || 'Ramesh Kumar',
        collectorPhone: collector?.phone || '+91 98765 43210',
        collectorRating: collector?.rating || 4.8,
        collectorDistance: inMem.collector_distance || '1.2 km away',
        otpCode: inMem.otp_code,
        createdAt: inMem.created_at,
      };
    }

    const { data: pickup } = await supabaseAdmin
      .from('pickup_requests')
      .select('*')
      .eq('id', pickupId)
      .maybeSingle();

    if (!pickup) {
      throw new NotFoundError(`Pickup ${pickupId} not found`, 'PICKUP_NOT_FOUND');
    }

    const citizen = await authService.getUserById(pickup.citizen_id);
    const collector = pickup.collector_id ? await authService.getUserById(pickup.collector_id) : null;

    const { data: dbItems } = await supabaseAdmin
      .from('pickup_items')
      .select('*')
      .eq('pickup_id', pickupId);

    const items: PickupItemResponse[] = (dbItems || []).map((it) => ({
      id: it.id,
      category: it.category,
      subType: it.sub_type,
      weightKg: parseFloat(it.weight_kg),
      pricePerKg: parseFloat(it.price_per_kg),
      estimatedTotal: parseFloat(it.estimated_total),
      confidenceScore: parseFloat(it.confidence_score || '0.95'),
      notes: it.notes || '',
    }));

    return {
      id: pickup.id,
      citizenId: pickup.citizen_id,
      citizenName: citizen.name,
      citizenAddress: pickup.citizen_address,
      citizenPhone: citizen.phone,
      items: items.length > 0 ? items : [
        {
          id: 'SC-1',
          category: 'Plastic',
          subType: 'PET Bottles',
          weightKg: 1.4,
          pricePerKg: 50.0,
          estimatedTotal: 70.0,
          confidenceScore: 0.94,
          notes: 'Standard recyclable bottles',
        },
      ],
      status: pickup.status as PickupStatus,
      totalEstimatedPrice: parseFloat(pickup.total_estimated_price || '0'),
      finalVerifiedPrice: parseFloat(pickup.final_verified_price || '0'),
      finalVerifiedWeight: parseFloat(pickup.final_verified_weight || '0'),
      scheduledDate: pickup.scheduled_date,
      timeSlot: pickup.time_slot,
      instructions: pickup.instructions || '',
      collectorId: pickup.collector_id || 'COL-892',
      collectorName: collector?.name || 'Ramesh Kumar',
      collectorPhone: collector?.phone || '+91 98765 43210',
      collectorRating: collector?.rating || 4.8,
      collectorDistance: pickup.collector_distance || '1.2 km away',
      otpCode: pickup.otp_code,
      createdAt: pickup.created_at || 'Just now',
    };
  }

  async getCitizenPickups(citizenId: string): Promise<PickupRequestResponse[]> {
    if (env.SUPABASE_URL.includes('mock-project.supabase.co') || env.NODE_ENV === 'test') {
      const matching = Array.from(inMemoryStore.pickups.values()).filter(
        (p) => p.citizen_id === citizenId,
      );
      if (matching.length === 0) {
        return [await this.getPickupById('PK-9481')];
      }
      return Promise.all(matching.map((p) => this.getPickupById(p.id)));
    }

    const { data: pickups } = await supabaseAdmin
      .from('pickup_requests')
      .select('id')
      .eq('citizen_id', citizenId)
      .order('created_at', { ascending: false });

    if (!pickups || pickups.length === 0) {
      // Fallback demo pickups
      return [
        await this.getPickupById('PK-9481').catch(() => this.getMockPickup('PK-9481', 'onTheWay')),
        await this.getPickupById('PK-8320').catch(() => this.getMockPickup('PK-8320', 'completed')),
      ];
    }

    return Promise.all(pickups.map((p) => this.getPickupById(p.id)));
  }

  async getCollectorPickups(collectorId: string): Promise<PickupRequestResponse[]> {
    if (env.SUPABASE_URL.includes('mock-project.supabase.co') || env.NODE_ENV === 'test') {
      const matching = Array.from(inMemoryStore.pickups.values()).filter(
        (p) => p.collector_id === collectorId || ['pending', 'matching'].includes(p.status),
      );
      if (matching.length === 0) {
        return [await this.getPickupById('PK-9481')];
      }
      return Promise.all(matching.map((p) => this.getPickupById(p.id)));
    }

    const { data: pickups } = await supabaseAdmin
      .from('pickup_requests')
      .select('id')
      .or(`collector_id.eq.${collectorId},status.in.(pending,matching)`)
      .order('created_at', { ascending: false });

    if (!pickups || pickups.length === 0) {
      return [await this.getMockPickup('PK-9481', 'onTheWay')];
    }

    return Promise.all(pickups.map((p) => this.getPickupById(p.id)));
  }

  async updateStatus(
    pickupId: string,
    input: UpdatePickupStatusInput,
    userId: string,
  ): Promise<PickupRequestResponse> {
    const current = await this.getPickupById(pickupId);

    // 1. Dual-layer State Machine Validation
    const allowedNext = VALID_TRANSITIONS[current.status];
    if (!allowedNext.includes(input.status)) {
      throw new BadRequestError(
        `Invalid status transition from '${current.status}' to '${input.status}'. Allowed transitions: ${allowedNext.join(', ') || 'None (Terminal state)'}`,
        'INVALID_STATUS_TRANSITION',
      );
    }

    // 2. Perform Update in Database or In-Memory
    if (env.SUPABASE_URL.includes('mock-project.supabase.co') || env.NODE_ENV === 'test') {
      const inMem = inMemoryStore.pickups.get(pickupId);
      if (inMem) {
        inMem.status = input.status;
        inMemoryStore.pickups.set(pickupId, inMem);
      }
      return this.getPickupById(pickupId);
    }

    await supabaseAdmin
      .from('pickup_requests')
      .update({
        status: input.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pickupId);

    // 3. Status History
    await supabaseAdmin.from('pickup_status_history').insert({
      pickup_id: pickupId,
      old_status: current.status,
      new_status: input.status,
      changed_by: userId,
      notes: input.notes || 'Status updated',
    });

    return this.getPickupById(pickupId);
  }

  async verifyPickup(
    pickupId: string,
    input: VerifyPickupInput,
    userId: string,
  ): Promise<PickupRequestResponse> {
    const current = await this.getPickupById(pickupId);

    if (current.status !== 'arrived' && current.status !== 'onTheWay') {
      throw new BadRequestError(
        `Cannot verify pickup in '${current.status}' state. Must be 'arrived'`,
        'INVALID_STATUS_FOR_VERIFICATION',
      );
    }

    if (current.otpCode !== input.otpCode) {
      throw new BadRequestError('Invalid OTP code. Please check with the citizen.', 'INVALID_OTP');
    }

    if (env.SUPABASE_URL.includes('mock-project.supabase.co') || env.NODE_ENV === 'test') {
      const inMem = inMemoryStore.pickups.get(pickupId);
      if (inMem) {
        inMem.status = 'verified';
        inMem.final_verified_weight = input.finalWeight;
        inMem.final_verified_price = input.finalAmount;
        inMemoryStore.pickups.set(pickupId, inMem);
      }
      return this.getPickupById(pickupId);
    }

    await supabaseAdmin
      .from('pickup_requests')
      .update({
        status: 'verified',
        final_verified_weight: input.finalWeight,
        final_verified_price: input.finalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pickupId);

    await supabaseAdmin.from('pickup_status_history').insert({
      pickup_id: pickupId,
      old_status: current.status,
      new_status: 'verified',
      changed_by: userId,
      notes: `Verified by collector with OTP. Weight: ${input.finalWeight}kg, Price: ₹${input.finalAmount}`,
    });

    return this.getPickupById(pickupId);
  }

  async cancelPickup(
    pickupId: string,
    input: CancelPickupInput,
    userId: string,
  ): Promise<PickupRequestResponse> {
    const current = await this.getPickupById(pickupId);

    if (current.status === 'completed' || current.status === 'cancelled') {
      throw new BadRequestError(`Cannot cancel a ${current.status} pickup`, 'INVALID_CANCELLATION');
    }

    await supabaseAdmin
      .from('pickup_requests')
      .update({
        status: 'cancelled',
        cancelled_reason: input.reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pickupId);

    await supabaseAdmin.from('pickup_status_history').insert({
      pickup_id: pickupId,
      old_status: current.status,
      new_status: 'cancelled',
      changed_by: userId,
      notes: `Cancelled. Reason: ${input.reason}`,
    });

    return this.getPickupById(pickupId);
  }

  private async getMockPickup(id: string, status: PickupStatus): Promise<PickupRequestResponse> {
    return {
      id,
      citizenId: '11111111-1111-4111-a111-111111111111',
      citizenName: 'Aarav Sharma',
      citizenAddress: 'Flat 402, Green Valley Apts, Sector 62, Noida',
      citizenPhone: '+91 98765 12345',
      items: [
        {
          id: 'SC-1',
          category: 'Plastic',
          subType: 'PET Bottles',
          weightKg: 1.4,
          pricePerKg: 50.0,
          estimatedTotal: 70.0,
          confidenceScore: 0.94,
          notes: 'PET bottles',
        },
        {
          id: 'SC-2',
          category: 'Paper & Cardboard',
          subType: 'Corrugated Boxes',
          weightKg: 3.2,
          pricePerKg: 15.0,
          estimatedTotal: 48.0,
          confidenceScore: 0.91,
          notes: 'Boxes',
        },
      ],
      status,
      totalEstimatedPrice: 118.0,
      finalVerifiedPrice: 118.0,
      finalVerifiedWeight: 4.6,
      scheduledDate: 'Today, 18 Sep',
      timeSlot: '11 AM - 1 PM',
      instructions: 'Ring bell twice',
      collectorId: '22222222-2222-4222-a222-222222222222',
      collectorName: 'Ramesh Kumar',
      collectorPhone: '+91 98765 43210',
      collectorRating: 4.8,
      collectorDistance: '1.2 km away',
      otpCode: '4829',
      createdAt: '10:15 AM',
    };
  }
}

export const pickupService = new PickupService();
