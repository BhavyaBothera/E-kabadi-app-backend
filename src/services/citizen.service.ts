import { supabaseAdmin } from '../config/supabase';
import { UpdateCitizenProfileInput, CreateAddressInput } from '../validators/citizen.schemas';
import { authService, UserResponse } from './auth.service';

export interface CitizenDashboard {
  user: UserResponse;
  stats: {
    ecoPoints: number;
    totalScrapSoldKg: number;
    totalEarnedInr: number;
    completedPickupsCount: number;
  };
  impact: {
    co2SavedKg: number;
    landfillSavedM3: number;
    treesSaved: number;
  };
}

export class CitizenService {
  async getDashboard(citizenId: string): Promise<CitizenDashboard> {
    const user = await authService.getUserById(citizenId);

    const { data: citizenProfile } = await supabaseAdmin
      .from('citizen_profiles')
      .select('*')
      .eq('user_id', citizenId)
      .maybeSingle();

    const ecoPoints = citizenProfile?.eco_points_balance ?? 840;
    const totalKg = parseFloat(citizenProfile?.total_scrap_sold_kg || '14.5');
    const totalEarned = parseFloat(citizenProfile?.total_earned_inr || '2450.0');
    const pickupsCount = citizenProfile?.total_pickups_completed ?? 3;

    // Environmental impact calculations based on standard factors
    const co2SavedKg = Math.round(totalKg * 1.5 * 100) / 100;
    const landfillSavedM3 = Math.round(totalKg * 0.0025 * 1000) / 1000;
    const treesSaved = Math.round((totalKg / 50) * 100) / 100;

    return {
      user,
      stats: {
        ecoPoints,
        totalScrapSoldKg: totalKg,
        totalEarnedInr: totalEarned,
        completedPickupsCount: pickupsCount,
      },
      impact: {
        co2SavedKg,
        landfillSavedM3,
        treesSaved,
      },
    };
  }

  async updateProfile(citizenId: string, input: UpdateCitizenProfileInput): Promise<UserResponse> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name) updateData.name = input.name;
    if (input.email) updateData.email = input.email;
    if (input.profilePhoto) updateData.profile_photo = input.profilePhoto;

    await supabaseAdmin.from('profiles').update(updateData).eq('id', citizenId);

    if (input.address) {
      await supabaseAdmin.from('addresses').upsert({
        user_id: citizenId,
        address_line: input.address,
        is_default: true,
        latitude: 28.6139,
        longitude: 77.2090,
      });
    }

    return authService.getUserById(citizenId);
  }

  async getAddresses(citizenId: string) {
    const { data: addresses } = await supabaseAdmin
      .from('addresses')
      .select('*')
      .eq('user_id', citizenId)
      .order('is_default', { ascending: false });

    return addresses || [];
  }

  async addAddress(citizenId: string, input: CreateAddressInput) {
    if (input.isDefault) {
      // Unset other default addresses
      await supabaseAdmin
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', citizenId);
    }

    const { data, error } = await supabaseAdmin
      .from('addresses')
      .insert({
        user_id: citizenId,
        title: input.title,
        address_line: input.addressLine,
        sector: input.sector,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        latitude: input.latitude,
        longitude: input.longitude,
        is_default: input.isDefault,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const citizenService = new CitizenService();
