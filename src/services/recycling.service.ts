import { supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import { inMemoryStore } from '../db/in-memory-store';
import { NotFoundError } from '../utils/errors';

export interface JourneyStepResponse {
  title: string;
  description: string;
  location: string;
  timestamp: string;
  isCompleted: boolean;
}

export interface RecyclingJourneyResponse {
  id: string;
  pickupId: string;
  materialCategory: string;
  weightKg: number;
  citizenName: string;
  collectorName: string;
  recyclerFacility: string;
  certificateId: string;
  steps: JourneyStepResponse[];
}

export class RecyclingService {
  async getJourneyByPickupId(pickupId: string): Promise<RecyclingJourneyResponse> {
    const isMock = env.SUPABASE_URL.includes('mock-project.supabase.co') || env.NODE_ENV === 'test';

    if (isMock) {
      return {
        id: `JRN-${pickupId.replace('PK-', '')}`,
        pickupId,
        materialCategory: 'Plastic (PET) & Paper',
        weightKg: 4.6,
        citizenName: 'Aarav Sharma',
        collectorName: 'Ramesh Kumar',
        recyclerFacility: 'GreenLoop Authorized Recycling Plant #4, Greater Noida',
        certificateId: `CERT-EK-2026-${pickupId.replace('PK-', '')}`,
        steps: [
          {
            title: 'Scrap Collected',
            description: 'Scrap picked up from household and weighed.',
            location: 'Sector 62, Noida',
            timestamp: '18 Sep, 11:30 AM',
            isCompleted: true,
          },
          {
            title: 'Collector Depot Verification',
            description: 'Scrap sorted & cataloged at regional collector hub.',
            location: 'Noida Central Hub',
            timestamp: '18 Sep, 02:15 PM',
            isCompleted: true,
          },
          {
            title: 'Dispatched to Authorized Recycler',
            description: 'Material transferred in batch #B-912 to GreenLoop.',
            location: 'Greater Noida Industrial Zone',
            timestamp: '18 Sep, 05:00 PM',
            isCompleted: true,
          },
          {
            title: 'Recycling Recorded & Certified',
            description: 'Polymer granules produced. Circular economy completed.',
            location: 'GreenLoop Processing Plant',
            timestamp: '19 Sep, 09:30 AM',
            isCompleted: true,
          },
        ],
      };
    }

    const { data: journey } = await supabaseAdmin
      .from('recycling_journeys')
      .select('*')
      .eq('pickup_id', pickupId)
      .maybeSingle();

    if (!journey) {
      throw new NotFoundError(`Recycling journey for pickup ${pickupId} not found`, 'JOURNEY_NOT_FOUND');
    }

    const { data: steps } = await supabaseAdmin
      .from('recycling_journey_steps')
      .select('*')
      .eq('journey_id', journey.id)
      .order('step_order', { ascending: true });

    return {
      id: journey.id,
      pickupId: journey.pickup_id,
      materialCategory: journey.material_category,
      weightKg: parseFloat(journey.weight_kg),
      citizenName: journey.citizen_name,
      collectorName: journey.collector_name,
      recyclerFacility: journey.recycler_facility,
      certificateId: journey.certificate_id,
      steps: (steps || []).map((s) => ({
        title: s.title,
        description: s.description,
        location: s.location,
        timestamp: s.created_at,
        isCompleted: s.is_completed,
      })),
    };
  }

  async getJourneyById(id: string): Promise<RecyclingJourneyResponse> {
    return this.getJourneyByPickupId(id.replace('JRN-', 'PK-'));
  }
}

export const recyclingService = new RecyclingService();
