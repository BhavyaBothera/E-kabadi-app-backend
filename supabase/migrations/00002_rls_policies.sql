-- ==============================================================================
-- 00002_rls_policies.sql
-- Supabase Row Level Security (RLS) Policies
-- ==============================================================================

-- 1. Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizen_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycler_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrap_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrap_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycling_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycling_journey_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_impact_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id OR is_admin());

-- ------------------------------------------------------------------------------
-- USER ROLES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can manage roles" ON user_roles
    FOR ALL USING (is_admin());

-- ------------------------------------------------------------------------------
-- ADDRESSES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can manage own addresses" ON addresses
    FOR ALL USING (auth.uid() = user_id OR is_admin());

-- ------------------------------------------------------------------------------
-- CITIZEN & COLLECTOR PROFILES
-- ------------------------------------------------------------------------------
CREATE POLICY "Citizens can manage own profile" ON citizen_profiles
    FOR ALL USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Collectors can manage own profile" ON collector_profiles
    FOR ALL USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Citizens can view collector public info" ON collector_profiles
    FOR SELECT USING (is_available = TRUE OR is_admin());

-- ------------------------------------------------------------------------------
-- SCRAP CATEGORIES & RATE CARDS (Public Read)
-- ------------------------------------------------------------------------------
CREATE POLICY "Anyone can view active categories" ON scrap_categories
    FOR SELECT USING (is_active = TRUE OR is_admin());

CREATE POLICY "Anyone can view active rates" ON rate_cards
    FOR SELECT USING (is_active = TRUE OR is_admin());

CREATE POLICY "Admins can manage rates" ON rate_cards
    FOR ALL USING (is_admin());

-- ------------------------------------------------------------------------------
-- PICKUP REQUESTS & ITEMS
-- ------------------------------------------------------------------------------
CREATE POLICY "Citizens can view and create own pickups" ON pickup_requests
    FOR ALL USING (auth.uid() = citizen_id OR auth.uid() = collector_id OR is_admin());

CREATE POLICY "Collectors can view assigned or nearby pickups" ON pickup_requests
    FOR SELECT USING (
        collector_id = auth.uid() 
        OR (status IN ('pending', 'matching') AND EXISTS (
            SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'collector'
        ))
        OR is_admin()
    );

CREATE POLICY "Users can view pickup items" ON pickup_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pickup_requests p
            WHERE p.id = pickup_items.pickup_id
            AND (p.citizen_id = auth.uid() OR p.collector_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Citizens can insert pickup items" ON pickup_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM pickup_requests p
            WHERE p.id = pickup_items.pickup_id
            AND p.citizen_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- PAYMENTS
-- ------------------------------------------------------------------------------
CREATE POLICY "Participants can view payments" ON payments
    FOR SELECT USING (citizen_id = auth.uid() OR collector_id = auth.uid() OR is_admin());

-- ------------------------------------------------------------------------------
-- REWARDS & CATALOG
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view own reward ledger" ON reward_transactions
    FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Anyone can view reward catalog" ON reward_catalog
    FOR SELECT USING (is_active = TRUE OR is_admin());

CREATE POLICY "Users can view own redemptions" ON reward_redemptions
    FOR ALL USING (user_id = auth.uid() OR is_admin());

-- ------------------------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view and update own notifications" ON notifications
    FOR ALL USING (user_id = auth.uid() OR is_admin());

-- ------------------------------------------------------------------------------
-- RECYCLING JOURNEYS
-- ------------------------------------------------------------------------------
CREATE POLICY "Participants can view journeys" ON recycling_journeys
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pickup_requests p
            WHERE p.id = recycling_journeys.pickup_id
            AND (p.citizen_id = auth.uid() OR p.collector_id = auth.uid() OR is_admin())
        )
        OR is_admin()
    );

CREATE POLICY "Participants can view journey steps" ON recycling_journey_steps
    FOR SELECT USING (TRUE);

-- ------------------------------------------------------------------------------
-- ADMIN AUDIT LOGS
-- ------------------------------------------------------------------------------
CREATE POLICY "Only admins can view audit logs" ON admin_audit_logs
    FOR SELECT USING (is_admin());
