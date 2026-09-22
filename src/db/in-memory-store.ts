// High-performance in-memory database store initialized with seed data
// Used for local offline development, unit tests, and seamless fallback when cloud Supabase is unreachable

export interface InMemProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  rating: number;
  is_verified: boolean;
  profile_photo: string;
}

export interface InMemPickup {
  id: string;
  citizen_id: string;
  collector_id: string | null;
  status: string;
  total_estimated_price: number;
  final_verified_price: number;
  final_verified_weight: number;
  scheduled_date: string;
  time_slot: string;
  citizen_address: string;
  instructions: string;
  otp_code: string;
  collector_distance: string;
  cancelled_reason?: string;
  created_at: string;
}

export interface InMemPickupItem {
  id: string;
  pickup_id: string;
  category: string;
  sub_type: string;
  weight_kg: number;
  price_per_kg: number;
  estimated_total: number;
  confidence_score: number;
  notes: string;
}

class InMemoryStore {
  profiles: Map<string, InMemProfile> = new Map();
  userRoles: Map<string, string> = new Map();
  citizenProfiles: Map<string, { ecoPoints: number; totalSoldKg: number; totalEarned: number }> = new Map();
  collectorProfiles: Map<string, {
    isAvailable: boolean;
    currentStatus: string;
    vehicleNumber: string;
    vehicleType: string;
    serviceArea: string;
    currentLat: number;
    currentLon: number;
    ecoCoins: number;
    todayEarnings: number;
    todayPickups: number;
    todayWeight: number;
  }> = new Map();
  pickups: Map<string, InMemPickup> = new Map();
  pickupItems: Map<string, InMemPickupItem[]> = new Map();
  payments: Map<string, any> = new Map();
  rewardTransactions: any[] = [];
  notifications: any[] = [];
  rewardCatalog: any[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.profiles.clear();
    this.userRoles.clear();
    this.citizenProfiles.clear();
    this.collectorProfiles.clear();
    this.pickups.clear();
    this.pickupItems.clear();
    this.payments.clear();
    this.rewardTransactions = [];
    this.notifications = [];
    this.rewardCatalog = [];

    // 1. Demo Profiles
    this.profiles.set('11111111-1111-4111-a111-111111111111', {
      id: '11111111-1111-4111-a111-111111111111',
      name: 'Aarav Sharma',
      phone: '+919876512345',
      email: 'aarav.sharma@example.com',
      rating: 4.9,
      is_verified: true,
      profile_photo: '',
    });
    this.userRoles.set('11111111-1111-4111-a111-111111111111', 'citizen');
    this.citizenProfiles.set('11111111-1111-4111-a111-111111111111', {
      ecoPoints: 840,
      totalSoldKg: 14.5,
      totalEarned: 2450.0,
    });

    this.profiles.set('22222222-2222-4222-a222-222222222222', {
      id: '22222222-2222-4222-a222-222222222222',
      name: 'Ramesh Kumar',
      phone: '+919876543210',
      email: 'ramesh.kumar@example.com',
      rating: 4.8,
      is_verified: true,
      profile_photo: '',
    });
    this.userRoles.set('22222222-2222-4222-a222-222222222222', 'collector');
    this.collectorProfiles.set('22222222-2222-4222-a222-222222222222', {
      isAvailable: true,
      currentStatus: 'Active',
      vehicleNumber: 'UP 16 AB 1234',
      vehicleType: 'Electric Three Wheeler',
      serviceArea: 'Sector 62 & 63, Noida',
      currentLat: 28.615,
      currentLon: 77.21,
      ecoCoins: 1250,
      todayEarnings: 2450.0,
      todayPickups: 7,
      todayWeight: 38.5,
    });

    this.profiles.set('99999999-9999-4999-a999-999999999999', {
      id: '99999999-9999-4999-a999-999999999999',
      name: 'System Admin',
      phone: '+919800011223',
      email: 'admin@ekabadi.com',
      rating: 5.0,
      is_verified: true,
      profile_photo: '',
    });
    this.userRoles.set('99999999-9999-4999-a999-999999999999', 'admin');

    // 2. Demo Pickups matching Flutter
    this.pickups.set('PK-9481', {
      id: 'PK-9481',
      citizen_id: '11111111-1111-4111-a111-111111111111',
      collector_id: '22222222-2222-4222-a222-222222222222',
      status: 'onTheWay',
      total_estimated_price: 118.0,
      final_verified_price: 118.0,
      final_verified_weight: 4.6,
      scheduled_date: 'Today, 18 Sep',
      time_slot: '11 AM - 1 PM',
      citizen_address: 'Flat 402, Green Valley Apts, Sector 62, Noida',
      instructions: 'Ring bell twice upon arrival',
      otp_code: '4829',
      collector_distance: '1.2 km away',
      created_at: '10:15 AM',
    });

    this.pickupItems.set('PK-9481', [
      {
        id: 'SC-1',
        pickup_id: 'PK-9481',
        category: 'Plastic',
        sub_type: 'PET Bottles',
        weight_kg: 1.4,
        price_per_kg: 50.0,
        estimated_total: 70.0,
        confidence_score: 0.94,
        notes: 'PET bottles',
      },
      {
        id: 'SC-2',
        pickup_id: 'PK-9481',
        category: 'Paper & Cardboard',
        sub_type: 'Corrugated Boxes',
        weight_kg: 3.2,
        price_per_kg: 15.0,
        estimated_total: 48.0,
        confidence_score: 0.91,
        notes: 'Boxes',
      },
    ]);

    this.pickups.set('PK-8320', {
      id: 'PK-8320',
      citizen_id: '11111111-1111-4111-a111-111111111111',
      collector_id: '22222222-2222-4222-a222-222222222222',
      status: 'completed',
      total_estimated_price: 850.0,
      final_verified_price: 850.0,
      final_verified_weight: 0.4,
      scheduled_date: '15 Sep 2026',
      time_slot: '2 PM - 4 PM',
      citizen_address: 'Flat 402, Green Valley Apts, Sector 62, Noida',
      instructions: 'Call before coming',
      otp_code: '1942',
      collector_distance: 'Completed',
      created_at: '15 Sep, 01:30 PM',
    });

    // 3. Demo Catalog
    this.rewardCatalog = [
      {
        id: 'CP-1',
        title: '₹50 Flat Cashback',
        description: 'Direct UPI transfer to your bank account.',
        points_cost: 500,
        partner_name: 'E-Kabaadi Direct',
        coupon_code: 'EKAB50CASH',
        expiry_date: '31 Oct 2026',
        target_role: 'citizen',
        is_active: true,
      },
      {
        id: 'CP-2',
        title: '15% Off Green Groceries',
        description: 'Valid on organic vegetables & fruits.',
        points_cost: 350,
        partner_name: 'Organic Bazaar',
        coupon_code: 'GREEN15',
        expiry_date: '15 Nov 2026',
        target_role: 'citizen',
        is_active: true,
      },
      {
        id: 'CP-3',
        title: 'Free Solar Lamp Kit',
        description: 'Rechargeable eco solar light for home.',
        points_cost: 1200,
        partner_name: 'CleanEnergy India',
        coupon_code: 'SOLARFREE',
        expiry_date: '31 Dec 2026',
        target_role: 'citizen',
        is_active: true,
      },
    ];

    // 4. Demo Notifications
    this.notifications = [
      {
        id: 'N-1',
        user_id: '11111111-1111-4111-a111-111111111111',
        title: 'Collector Accepted Pickup',
        message: 'Ramesh Kumar has accepted your pickup request and is on the way.',
        type: 'pickup',
        is_read: false,
        created_at: '10 mins ago',
      },
      {
        id: 'N-2',
        user_id: '11111111-1111-4111-a111-111111111111',
        title: 'Payment Received',
        message: 'Payment of ₹118 has been transferred to your UPI account.',
        type: 'payment',
        is_read: true,
        created_at: '2 hours ago',
      },
    ];
  }
}

export const inMemoryStore = new InMemoryStore();
