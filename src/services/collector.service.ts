import { supabaseAdmin } from '../config/supabase';
import {
  UpdateCollectorStatusInput,
  UpdateCollectorLocationInput,
  NearbyCollectorsQueryInput,
} from '../validators/collector.schemas';
import { calculateHaversineDistanceKm, formatDistanceString } from '../utils/geo';
import { authService } from './auth.service';

export interface NearbyCollectorInfo {
  id: string;
  name: string;
  phone: string;
  rating: number;
  vehicleNumber: string;
  vehicleType: string;
  serviceArea: string;
  distanceKm: number;
  distanceString: string;
  etaString: string;
  activeQueueCount: number;
}

export class CollectorService {
  async updateStatus(collectorId: string, input: UpdateCollectorStatusInput) {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.isAvailable !== undefined) updateData.is_available = input.isAvailable;
    if (input.status !== undefined) updateData.current_status = input.status;

    await supabaseAdmin
      .from('collector_profiles')
      .update(updateData)
      .eq('user_id', collectorId);

    return this.getEarnings(collectorId);
  }

  async updateLocation(collectorId: string, input: UpdateCollectorLocationInput) {
    await supabaseAdmin
      .from('collector_profiles')
      .update({
        current_latitude: input.latitude,
        current_longitude: input.longitude,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', collectorId);

    return { latitude: input.latitude, longitude: input.longitude };
  }

  async getEarnings(collectorId: string) {
    const user = await authService.getUserById(collectorId);

    const { data: profile } = await supabaseAdmin
      .from('collector_profiles')
      .select('*')
      .eq('user_id', collectorId)
      .maybeSingle();

    return {
      collector: user,
      isAvailable: profile?.is_available ?? true,
      currentStatus: profile?.current_status ?? 'Active',
      todayEarnings: parseFloat(profile?.today_earnings || '2450.0'),
      todayPickupsCount: profile?.today_pickups_count ?? 7,
      todayWeightKg: parseFloat(profile?.today_weight_kg || '38.5'),
      ecoCoinsBalance: profile?.eco_coins_balance ?? 1250,
    };
  }

  async getNearbyCollectors(query: NearbyCollectorsQueryInput): Promise<NearbyCollectorInfo[]> {
    const { data: collectors } = await supabaseAdmin
      .from('collector_profiles')
      .select('user_id, vehicle_number, vehicle_type, service_area, current_latitude, current_longitude, is_available, current_status')
      .eq('is_available', true);

    const targetLat = query.latitude || 28.6139;
    const targetLon = query.longitude || 77.2090;
    const radius = query.radiusKm || 10;

    if (!collectors || collectors.length === 0) {
      // Return realistic demo fallback matching Flutter collector
      return [
        {
          id: '22222222-2222-4222-a222-222222222222',
          name: 'Ramesh Kumar',
          phone: '+91 98765 43210',
          rating: 4.8,
          vehicleNumber: 'UP 16 AB 1234',
          vehicleType: 'Electric Three Wheeler',
          serviceArea: 'Sector 62 & 63, Noida',
          distanceKm: 1.2,
          distanceString: '1.2 km away',
          etaString: '6 mins (1.2 km away)',
          activeQueueCount: 1,
        },
        {
          id: 'COL-102',
          name: 'Ravi Kumar',
          phone: '+91 98765 88990',
          rating: 4.6,
          vehicleNumber: 'UP 16 CD 5678',
          vehicleType: 'Electric Van',
          serviceArea: 'Sector 62, Noida',
          distanceKm: 2.1,
          distanceString: '2.1 km away',
          etaString: '11 mins (2.1 km away)',
          activeQueueCount: 2,
        },
      ];
    }

    const results: NearbyCollectorInfo[] = [];

    for (const c of collectors) {
      const distance = calculateHaversineDistanceKm(
        targetLat,
        targetLon,
        c.current_latitude || 28.6139,
        c.current_longitude || 77.2090,
      );

      if (distance <= radius) {
        const user = await authService.getUserById(c.user_id);
        const etaMinutes = Math.max(3, Math.round(distance * 4));

        results.push({
          id: c.user_id,
          name: user.name,
          phone: user.phone,
          rating: user.rating,
          vehicleNumber: c.vehicle_number,
          vehicleType: c.vehicle_type,
          serviceArea: c.service_area,
          distanceKm: distance,
          distanceString: formatDistanceString(distance),
          etaString: `${etaMinutes} mins (${formatDistanceString(distance)})`,
          activeQueueCount: 1,
        });
      }
    }

    // Sort by distance ascending
    return results.sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

export const collectorService = new CollectorService();
