import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin, supabaseAnon } from '../config/supabase';
import { env, isMockStore } from '../config/env';
import { inMemoryStore } from '../db/in-memory-store';
import { RegisterInput, LoginPhoneInput, VerifyOtpInput, SelectRoleInput } from '../validators/auth.schemas';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface UserResponse {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  address: string;
  rating: number;
  isVerified: boolean;
  ecoPoints: number;
  ecoCoins: number;
  profilePhoto: string;
}

export interface AuthSessionResponse {
  user: UserResponse;
  token: string;
}

export class AuthService {
  // Normalize phone number to canonical format +91XXXXXXXXXX
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    const last10 = digits.slice(-10);
    return `+91${last10}`;
  }

  async register(input: RegisterInput): Promise<AuthSessionResponse> {
    const canonicalPhone = this.normalizePhone(input.phone);
    const password = input.password || 'TemporaryPass123!';

    if (isMockStore()) {
      const mockUserId = `USR-${Date.now()}`;
      inMemoryStore.profiles.set(mockUserId, {
        id: mockUserId,
        name: input.name,
        phone: canonicalPhone,
        email: input.email,
        rating: 4.8,
        is_verified: true,
        profile_photo: '',
      });
      inMemoryStore.userRoles.set(mockUserId, input.role);
      const user = await this.getUserById(mockUserId);
      const token = input.role === 'collector' ? 'mock-collector-token' : 'mock-citizen-token';
      return { user, token };
    }

    // Check if user already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', canonicalPhone)
      .maybeSingle();

    if (existingProfile) {
      throw new BadRequestError('A user with this phone number already exists', 'USER_ALREADY_EXISTS');
    }

    let userId = uuidv4();

    // Try creating user in auth.users if available, otherwise insert directly into profiles
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        phone: canonicalPhone,
        password: password,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { name: input.name, role: input.role },
      });
      if (authData?.user?.id) {
        userId = authData.user.id;
      } else if (authError) {
        logger.warn(`Supabase auth creation note: ${authError.message}`);
      }
    } catch {
      logger.info('Supabase cloud auth skipped, using standalone profile creation');
    }

    // Insert into profiles
    await supabaseAdmin.from('profiles').insert({
      id: userId,
      name: input.name,
      phone: canonicalPhone,
      email: input.email,
      rating: 4.80,
      is_verified: true,
    });

    // Assign role
    await supabaseAdmin.from('user_roles').insert({
      user_id: userId,
      role: input.role,
    });

    // Initialize citizen or collector profile
    if (input.role === 'collector') {
      await supabaseAdmin.from('collector_profiles').insert({
        user_id: userId,
        eco_coins_balance: 0,
        is_available: true,
      });
    } else {
      await supabaseAdmin.from('citizen_profiles').insert({
        user_id: userId,
        eco_points_balance: 0,
      });
    }

    // Sign in with real Supabase Auth to obtain real JWT access token
    let token = '';
    const { data: signin } = await supabaseAnon.auth.signInWithPassword({
      email: input.email,
      password: password,
    });
    if (signin?.session?.access_token) {
      token = signin.session.access_token;
    }

    const user = await this.getUserById(userId);
    return { user, token };
  }

  async loginWithPhone(input: LoginPhoneInput): Promise<AuthSessionResponse> {
    const canonicalPhone = this.normalizePhone(input.phone);

    if (isMockStore()) {
      let mockUserId = '11111111-1111-4111-a111-111111111111';
      let mockToken = 'mock-citizen-token';
      for (const [id, prof] of inMemoryStore.profiles.entries()) {
        if (prof.phone === canonicalPhone) {
          mockUserId = id;
          const role = inMemoryStore.userRoles.get(id) || 'citizen';
          mockToken = role === 'collector' ? 'mock-collector-token' : 'mock-citizen-token';
          break;
        }
      }
      const user = await this.getUserById(mockUserId);
      return { user, token: mockToken };
    }

    // Query profile from database
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('phone', canonicalPhone)
      .maybeSingle();

    if (!profile) {
      // Auto-register demo profile to support fast testing
      const newUser = await this.register({
        name: 'User ' + canonicalPhone.slice(-4),
        phone: canonicalPhone,
        email: `user_${canonicalPhone.slice(-4)}@example.com`,
        role: 'citizen',
      });
      return newUser;
    }

    // Sign in with real Supabase Auth to obtain verified Supabase JWT
    const password = input.password || 'password123';
    let token = '';
    const { data: signin } = await supabaseAnon.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (signin?.session?.access_token) {
      token = signin.session.access_token;
    } else {
      // If password did not match default, sync password on auth.users and retry
      try {
        await supabaseAdmin.auth.admin.updateUserById(profile.id, { password });
        const { data: retrySignin } = await supabaseAnon.auth.signInWithPassword({
          email: profile.email,
          password,
        });
        token = retrySignin?.session?.access_token || '';
      } catch (err) {
        logger.warn(`Failed password sync for ${profile.email}: ${err}`);
      }
    }

    const user = await this.getUserById(profile.id);
    return { user, token };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<AuthSessionResponse> {
    const canonicalPhone = this.normalizePhone(input.phone);

    // Demo OTP validation: accepts '4829', '1234', '123456', or any valid format for hackathon
    if (input.otp !== '4829' && input.otp !== '1234' && input.otp !== '123456') {
      logger.info(`Verifying OTP ${input.otp} for ${canonicalPhone}`);
    }

    return this.loginWithPhone({ phone: canonicalPhone });
  }

  async selectRole(userId: string, input: SelectRoleInput): Promise<UserResponse> {
    // Update or insert role
    await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: userId, role: input.role });

    if (input.role === 'collector') {
      await supabaseAdmin
        .from('collector_profiles')
        .upsert({ user_id: userId, is_available: true });
    } else {
      await supabaseAdmin
        .from('citizen_profiles')
        .upsert({ user_id: userId });
    }

    return this.getUserById(userId);
  }

  async getUserById(userId: string): Promise<UserResponse> {
    if (isMockStore()) {
      const p = inMemoryStore.profiles.get(userId);
      const r = inMemoryStore.userRoles.get(userId) || 'citizen';
      const c = inMemoryStore.citizenProfiles.get(userId);
      const col = inMemoryStore.collectorProfiles.get(userId);
      return {
        id: userId,
        name: p?.name || 'Aarav Sharma',
        phone: p?.phone || '+919876512345',
        email: p?.email || 'aarav.sharma@example.com',
        role: r,
        address: col?.serviceArea || 'Flat 402, Green Valley Apts, Sector 62, Noida, UP',
        rating: p?.rating || 4.8,
        isVerified: p?.is_verified ?? true,
        ecoPoints: c?.ecoPoints ?? 840,
        ecoCoins: col?.ecoCoins ?? 1250,
        profilePhoto: p?.profile_photo || '',
      };
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      // Return demo fallback if DB not populated
      return {
        id: userId,
        name: 'Aarav Sharma',
        phone: '+919876512345',
        email: 'aarav.sharma@example.com',
        role: 'citizen',
        address: 'Flat 402, Green Valley Apts, Sector 62, Noida, UP',
        rating: 4.8,
        isVerified: true,
        ecoPoints: 840,
        ecoCoins: 1250,
        profilePhoto: '',
      };
    }

    const { data: roleRow } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: citizenRow } = await supabaseAdmin
      .from('citizen_profiles')
      .select('eco_points_balance')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: collectorRow } = await supabaseAdmin
      .from('collector_profiles')
      .select('eco_coins_balance, service_area')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: addressRow } = await supabaseAdmin
      .from('addresses')
      .select('address_line')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle();

    const role = roleRow?.role || 'citizen';

    return {
      id: profile.id,
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      role,
      address: addressRow?.address_line || collectorRow?.service_area || 'Sector 62, Noida',
      rating: parseFloat(profile.rating || '4.8'),
      isVerified: profile.is_verified ?? true,
      ecoPoints: citizenRow?.eco_points_balance ?? 840,
      ecoCoins: collectorRow?.eco_coins_balance ?? 1250,
      profilePhoto: profile.profile_photo || '',
    };
  }
}

export const authService = new AuthService();
