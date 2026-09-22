-- ==============================================================================
-- 00001_initial_schema.sql
-- E-Kabadi Smart Scrap Collection Platform Schema
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for hashing if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES & ROLES
-- ==============================================================================

CREATE TYPE app_role AS ENUM ('citizen', 'collector', 'recycler', 'admin');

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    profile_photo TEXT DEFAULT '',
    rating NUMERIC(3, 2) DEFAULT 4.80 CHECK (rating >= 1.00 AND rating <= 5.00),
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_canonical_phone CHECK (phone ~ '^\+91[6-9][0-9]{9}$')
);

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_user_role UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- ==============================================================================
-- 2. ADDRESSES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(100) DEFAULT 'Home',
    address_line TEXT NOT NULL,
    sector VARCHAR(100),
    city VARCHAR(100) DEFAULT 'Noida',
    state VARCHAR(100) DEFAULT 'Uttar Pradesh',
    pincode VARCHAR(10) DEFAULT '201301',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

-- ==============================================================================
-- 3. CITIZEN PROFILES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS citizen_profiles (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    eco_points_balance INT DEFAULT 0 CHECK (eco_points_balance >= 0),
    default_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
    total_pickups_completed INT DEFAULT 0 CHECK (total_pickups_completed >= 0),
    total_scrap_sold_kg NUMERIC(10, 2) DEFAULT 0.00 CHECK (total_scrap_sold_kg >= 0.00),
    total_earned_inr NUMERIC(12, 2) DEFAULT 0.00 CHECK (total_earned_inr >= 0.00),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 4. COLLECTOR PROFILES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS collector_profiles (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    vehicle_number VARCHAR(50) DEFAULT 'UP 16 AB 1234',
    vehicle_type VARCHAR(50) DEFAULT 'Electric Three Wheeler',
    service_area VARCHAR(255) DEFAULT 'Sector 62 & 63, Noida',
    is_available BOOLEAN DEFAULT TRUE,
    current_status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Offline', 'Suspended'
    current_latitude DOUBLE PRECISION DEFAULT 28.6139,
    current_longitude DOUBLE PRECISION DEFAULT 77.2090,
    eco_coins_balance INT DEFAULT 0 CHECK (eco_coins_balance >= 0),
    today_earnings NUMERIC(10, 2) DEFAULT 0.00 CHECK (today_earnings >= 0.00),
    today_pickups_count INT DEFAULT 0 CHECK (today_pickups_count >= 0),
    today_weight_kg NUMERIC(10, 2) DEFAULT 0.00 CHECK (today_weight_kg >= 0.00),
    total_pickups_completed INT DEFAULT 0 CHECK (total_pickups_completed >= 0),
    total_weight_collected_kg NUMERIC(12, 2) DEFAULT 0.00 CHECK (total_weight_collected_kg >= 0.00),
    kyc_verified BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_collector_status ON collector_profiles(is_available, current_status);

-- ==============================================================================
-- 5. RECYCLER PROFILES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS recycler_profiles (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    facility_name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    facility_address TEXT NOT NULL,
    capacity_tonnes_daily NUMERIC(8, 2) DEFAULT 50.00,
    is_authorized BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 6. SCRAP CATEGORIES & RATE CARDS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS scrap_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon_name VARCHAR(50) NOT NULL,
    description TEXT,
    unit VARCHAR(20) DEFAULT 'kg', -- 'kg' or 'unit'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES scrap_categories(id) ON DELETE CASCADE,
    sub_type VARCHAR(100) NOT NULL,
    min_rate NUMERIC(10, 2) NOT NULL CHECK (min_rate >= 0.00),
    max_rate NUMERIC(10, 2) NOT NULL CHECK (max_rate >= min_rate),
    current_rate NUMERIC(10, 2) NOT NULL CHECK (current_rate >= 0.00),
    unit VARCHAR(20) DEFAULT 'kg',
    popular_item BOOLEAN DEFAULT FALSE,
    trend_type VARCHAR(20) DEFAULT 'neutral', -- 'up', 'down', 'neutral'
    trend_percentage VARCHAR(20) DEFAULT '0.0%',
    is_active BOOLEAN DEFAULT TRUE,
    effective_from TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_cards_category ON rate_cards(category_id, is_active);

-- ==============================================================================
-- 7. SCRAP ITEMS & AI ANALYSES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS scrap_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    image_url TEXT,
    is_from_camera BOOLEAN DEFAULT FALSE,
    detected_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    raw_provider_response JSONB,
    confidence_average NUMERIC(4, 3) DEFAULT 0.900,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 8. PICKUP REQUESTS & ITEMS
-- ==============================================================================

CREATE TYPE pickup_status AS ENUM (
    'pending',
    'matching',
    'accepted',
    'onTheWay',
    'arrived',
    'verified',
    'completed',
    'cancelled'
);

CREATE TABLE IF NOT EXISTS pickup_requests (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'PK-9481' or UUID string
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    collector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status pickup_status NOT NULL DEFAULT 'pending',
    total_estimated_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_estimated_price >= 0.00),
    final_verified_price NUMERIC(10, 2) DEFAULT 0.00 CHECK (final_verified_price >= 0.00),
    final_verified_weight NUMERIC(10, 2) DEFAULT 0.00 CHECK (final_verified_weight >= 0.00),
    scheduled_date VARCHAR(100) NOT NULL,
    time_slot VARCHAR(100) NOT NULL,
    citizen_address TEXT NOT NULL,
    latitude DOUBLE PRECISION DEFAULT 28.6139,
    longitude DOUBLE PRECISION DEFAULT 77.2090,
    instructions TEXT DEFAULT '',
    otp_code VARCHAR(10) NOT NULL,
    collector_distance VARCHAR(50) DEFAULT '1.2 km away',
    cancelled_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pickups_citizen ON pickup_requests(citizen_id);
CREATE INDEX IF NOT EXISTS idx_pickups_collector ON pickup_requests(collector_id);
CREATE INDEX IF NOT EXISTS idx_pickups_status ON pickup_requests(status);

CREATE TABLE IF NOT EXISTS pickup_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pickup_id VARCHAR(50) NOT NULL REFERENCES pickup_requests(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    sub_type VARCHAR(100) NOT NULL,
    weight_kg NUMERIC(10, 2) NOT NULL CHECK (weight_kg > 0.00),
    price_per_kg NUMERIC(10, 2) NOT NULL CHECK (price_per_kg >= 0.00),
    estimated_total NUMERIC(10, 2) NOT NULL CHECK (estimated_total >= 0.00),
    confidence_score NUMERIC(4, 3) DEFAULT 0.950,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pickup_items_pickup ON pickup_items(pickup_id);

CREATE TABLE IF NOT EXISTS pickup_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pickup_id VARCHAR(50) NOT NULL REFERENCES pickup_requests(id) ON DELETE CASCADE,
    old_status pickup_status,
    new_status pickup_status NOT NULL,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pickup_history_pickup ON pickup_status_history(pickup_id);

CREATE TABLE IF NOT EXISTS collector_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pickup_id VARCHAR(50) NOT NULL REFERENCES pickup_requests(id) ON DELETE CASCADE,
    collector_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'assigned', -- 'assigned', 'accepted', 'rejected', 'timed_out'
    matching_score NUMERIC(6, 2) DEFAULT 0.00,
    distance_km NUMERIC(6, 2),
    assigned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_collector_assign_pickup ON collector_assignments(pickup_id);

-- ==============================================================================
-- 9. PAYMENTS & EVENTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'PAY-901'
    pickup_id VARCHAR(50) NOT NULL REFERENCES pickup_requests(id) ON DELETE RESTRICT,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    collector_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0.00),
    method VARCHAR(100) DEFAULT 'UPI / GPay',
    status VARCHAR(50) DEFAULT 'SUCCESS',
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    idempotency_key VARCHAR(100) UNIQUE,
    eco_points_earned INT DEFAULT 0 CHECK (eco_points_earned >= 0),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_pickup ON payments(pickup_id);
CREATE INDEX IF NOT EXISTS idx_payments_citizen ON payments(citizen_id);

CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id VARCHAR(50) REFERENCES payments(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'razorpay', 'mock'
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 10. REWARD LEDGER & CATALOG
-- ==============================================================================

CREATE TYPE reward_transaction_type AS ENUM ('earned', 'redeemed', 'reversed');

CREATE TABLE IF NOT EXISTS reward_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    type reward_transaction_type NOT NULL,
    amount INT NOT NULL CHECK (amount >= 0),
    source VARCHAR(100) NOT NULL, -- 'pickup_payment', 'catalog_redemption', 'manual_adjustment'
    reference_id VARCHAR(100),    -- pickup_id or payment_id or coupon_id
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'Transaction', -- 'Ration', 'Healthcare', 'Tools', 'Transaction'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_reward_tx_idempotent UNIQUE (user_id, source, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_reward_tx_user ON reward_transactions(user_id);

CREATE TABLE IF NOT EXISTS reward_catalog (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'CP-1'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    points_cost INT NOT NULL CHECK (points_cost > 0),
    partner_name VARCHAR(255) NOT NULL,
    coupon_code VARCHAR(100) NOT NULL,
    expiry_date VARCHAR(100) NOT NULL,
    target_role app_role DEFAULT 'citizen',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    catalog_item_id VARCHAR(50) NOT NULL REFERENCES reward_catalog(id) ON DELETE RESTRICT,
    points_cost INT NOT NULL,
    issued_coupon_code VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    redeemed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 11. RECYCLING JOURNEYS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS recycling_journeys (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'JRN-4819'
    pickup_id VARCHAR(50) NOT NULL REFERENCES pickup_requests(id) ON DELETE RESTRICT,
    material_category VARCHAR(255) NOT NULL,
    weight_kg NUMERIC(10, 2) NOT NULL CHECK (weight_kg > 0.00),
    citizen_name VARCHAR(255) NOT NULL,
    collector_name VARCHAR(255) NOT NULL,
    recycler_facility VARCHAR(255) NOT NULL,
    certificate_id VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'processing',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recycling_pickup ON recycling_journeys(pickup_id);

CREATE TABLE IF NOT EXISTS recycling_journey_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id VARCHAR(50) NOT NULL REFERENCES recycling_journeys(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_journey_steps_journey ON recycling_journey_steps(journey_id, step_order);

-- ==============================================================================
-- 12. NOTIFICATIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'N-1' or UUID
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'pickup', 'payment', 'reward', 'journey'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ==============================================================================
-- 13. MATERIAL IMPACT FACTORS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS material_impact_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_slug VARCHAR(100) NOT NULL UNIQUE,
    co2_kg_per_kg NUMERIC(6, 3) NOT NULL, -- kg of CO2 averted per kg scrap
    landfill_m3_per_kg NUMERIC(6, 4) NOT NULL,
    trees_saved_per_tonne NUMERIC(6, 2) DEFAULT 0.00,
    water_liters_per_kg NUMERIC(8, 2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 14. ADMIN AUDIT LOGS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    action VARCHAR(100) NOT NULL,
    target_entity VARCHAR(100) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON admin_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_logs(created_at);

-- ==============================================================================
-- 15. DUAL-LAYER STATE MACHINE: DATABASE TRIGGER
-- ==============================================================================

CREATE OR REPLACE FUNCTION validate_pickup_transition()
RETURNS TRIGGER AS $$
DECLARE
    is_valid BOOLEAN := FALSE;
BEGIN
    -- Allow initial insert
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- If status hasn't changed, allow update
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Valid Transition Graph:
    -- pending -> matching, accepted, cancelled
    -- matching -> accepted, cancelled
    -- accepted -> onTheWay, cancelled
    -- onTheWay -> arrived, cancelled
    -- arrived -> verified, cancelled
    -- verified -> completed, cancelled
    -- completed -> (terminal)
    -- cancelled -> (terminal)

    IF OLD.status = 'pending' AND NEW.status IN ('matching', 'accepted', 'cancelled') THEN
        is_valid := TRUE;
    ELSIF OLD.status = 'matching' AND NEW.status IN ('accepted', 'cancelled') THEN
        is_valid := TRUE;
    ELSIF OLD.status = 'accepted' AND NEW.status IN ('onTheWay', 'cancelled') THEN
        is_valid := TRUE;
    ELSIF OLD.status = 'onTheWay' AND NEW.status IN ('arrived', 'cancelled') THEN
        is_valid := TRUE;
    ELSIF OLD.status = 'arrived' AND NEW.status IN ('verified', 'cancelled') THEN
        is_valid := TRUE;
    ELSIF OLD.status = 'verified' AND NEW.status IN ('completed', 'cancelled') THEN
        is_valid := TRUE;
    END IF;

    IF NOT is_valid THEN
        RAISE EXCEPTION 'Invalid pickup state transition from % to %', OLD.status, NEW.status;
    END IF;

    -- Log transition to history
    INSERT INTO pickup_status_history (pickup_id, old_status, new_status, notes)
    VALUES (NEW.id, OLD.status, NEW.status, 'Automated transition trigger');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_pickup_transition ON pickup_requests;
CREATE TRIGGER trg_validate_pickup_transition
BEFORE UPDATE OF status ON pickup_requests
FOR EACH ROW
EXECUTE FUNCTION validate_pickup_transition();
