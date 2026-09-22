-- ==============================================================================
-- seed.sql
-- E-Kabadi Realistic Hackathon Seed Data
-- ==============================================================================

-- 1. MATERIAL IMPACT FACTORS
INSERT INTO material_impact_factors (category_slug, co2_kg_per_kg, landfill_m3_per_kg, trees_saved_per_tonne, water_liters_per_kg)
VALUES
    ('plastic', 1.500, 0.0025, 0.00, 24.00),
    ('paper', 0.900, 0.0018, 17.00, 26.00),
    ('metal', 4.200, 0.0010, 0.00, 40.00),
    ('e-waste', 8.500, 0.0030, 0.00, 120.00),
    ('electronics', 6.800, 0.0028, 0.00, 95.00),
    ('appliances', 5.200, 0.0020, 0.00, 70.00)
ON CONFLICT (category_slug) DO NOTHING;

-- 2. SCRAP CATEGORIES
INSERT INTO scrap_categories (id, name, slug, icon_name, description, unit)
VALUES
    ('33333333-3333-4333-a333-000000000001', 'Plastic', 'plastic', 'bottle', 'PET bottles, HDPE containers, hard plastics', 'kg'),
    ('33333333-3333-4333-a333-000000000002', 'Paper & Cardboard', 'paper', 'file-text', 'Newspapers, corrugated boxes, books', 'kg'),
    ('33333333-3333-4333-a333-000000000003', 'Metal & Aluminium', 'metal', 'anvil', 'Aluminium cans, iron rods, copper wire', 'kg'),
    ('33333333-3333-4333-a333-000000000004', 'E-Waste', 'e-waste', 'cpu', 'Smartphones, motherboards, batteries', 'unit'),
    ('33333333-3333-4333-a333-000000000005', 'Electronics', 'electronics', 'tv', 'Microwaves, small TVs, monitors', 'unit'),
    ('33333333-3333-4333-a333-000000000006', 'Appliances', 'appliances', 'sparkles', 'Air conditioners, washing machines, refrigerators', 'unit')
ON CONFLICT (name) DO NOTHING;

-- 3. RATE CARDS
INSERT INTO rate_cards (category_id, sub_type, min_rate, max_rate, current_rate, unit, popular_item, trend_type, trend_percentage)
VALUES
    ('33333333-3333-4333-a333-000000000001', 'PET Bottles & Containers', 35.00, 60.00, 50.00, 'kg', TRUE, 'neutral', '0.0%'),
    ('33333333-3333-4333-a333-000000000001', 'Hard Plastic Containers', 25.00, 45.00, 35.00, 'kg', FALSE, 'up', '+1.2%'),
    ('33333333-3333-4333-a333-000000000002', 'Newspapers', 14.00, 22.00, 18.00, 'kg', TRUE, 'up', '+1.5%'),
    ('33333333-3333-4333-a333-000000000002', 'Corrugated Boxes', 10.00, 18.00, 15.00, 'kg', TRUE, 'up', '+0.5%'),
    ('33333333-3333-4333-a333-000000000003', 'Aluminium Beverage Cans', 90.00, 140.00, 115.00, 'kg', TRUE, 'down', '-1.0%'),
    ('33333333-3333-4333-a333-000000000003', 'Iron Rods & Scrap Steel', 25.00, 35.00, 28.00, 'kg', FALSE, 'down', '-2.0%'),
    ('33333333-3333-4333-a333-000000000003', 'Copper Wire', 450.00, 650.00, 550.00, 'kg', FALSE, 'up', '+3.5%'),
    ('33333333-3333-4333-a333-000000000004', 'Old Smartphone & Charger', 200.00, 1200.00, 850.00, 'unit', TRUE, 'up', '+5.2%'),
    ('33333333-3333-4333-a333-000000000004', 'Motherboards & PCB', 80.00, 450.00, 220.00, 'unit', FALSE, 'neutral', '0.0%'),
    ('33333333-3333-4333-a333-000000000005', 'Microwaves', 150.00, 600.00, 350.00, 'unit', FALSE, 'neutral', '0.0%'),
    ('33333333-3333-4333-a333-000000000006', 'Washing Machines', 400.00, 1500.00, 850.00, 'unit', FALSE, 'up', '+2.0%');

-- 4. REWARD CATALOG
INSERT INTO reward_catalog (id, title, description, points_cost, partner_name, coupon_code, expiry_date, target_role)
VALUES
    ('CP-1', '₹50 Flat Cashback', 'Direct UPI transfer to your bank account.', 500, 'E-Kabaadi Direct', 'EKAB50CASH', '31 Oct 2026', 'citizen'),
    ('CP-2', '15% Off Green Groceries', 'Valid on organic vegetables & fruits.', 350, 'Organic Bazaar', 'GREEN15', '15 Nov 2026', 'citizen'),
    ('CP-3', 'Free Solar Lamp Kit', 'Rechargeable eco solar light for home.', 1200, 'CleanEnergy India', 'SOLARFREE', '31 Dec 2026', 'citizen'),
    ('CP-COL-1', 'Monthly Ration Voucher', '10kg Rice & Atta Ration Kit from partner store.', 500, 'Kisan Seva Kendra', 'RATION10KG', '31 Dec 2026', 'collector'),
    ('CP-COL-2', 'Safety & Gear Kit', 'High-durability puncture-resistant gloves and safety boots.', 300, 'SafetyFirst India', 'GEARPRO', '31 Dec 2026', 'collector')
ON CONFLICT (id) DO NOTHING;

-- 5. DEMO PROFILES
-- Note: In Supabase, these users would be registered in auth.users first.
-- For local standalone development, these UUIDs match standard demo accounts.
DO $$
BEGIN
    -- Only insert if auth.users contains them or in test mocks
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        -- Insert mock auth users if not present
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
        VALUES 
            ('11111111-1111-4111-a111-111111111111', 'aarav.sharma@example.com', crypt('password123', gen_salt('bf')), now(), '{"name":"Aarav Sharma"}'::jsonb),
            ('22222222-2222-4222-a222-222222222222', 'ramesh.kumar@example.com', crypt('password123', gen_salt('bf')), now(), '{"name":"Ramesh Kumar"}'::jsonb),
            ('99999999-9999-4999-a999-999999999999', 'admin@ekabadi.com', crypt('admin123', gen_salt('bf')), now(), '{"name":"Super Admin"}'::jsonb)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

INSERT INTO profiles (id, name, phone, email, rating, is_verified)
VALUES
    ('11111111-1111-4111-a111-111111111111', 'Aarav Sharma', '+919876512345', 'aarav.sharma@example.com', 4.90, TRUE),
    ('22222222-2222-4222-a222-222222222222', 'Ramesh Kumar', '+919876543210', 'ramesh.kumar@example.com', 4.80, TRUE),
    ('99999999-9999-4999-a999-999999999999', 'System Admin', '+919800011223', 'admin@ekabadi.com', 5.00, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role)
VALUES
    ('11111111-1111-4111-a111-111111111111', 'citizen'),
    ('22222222-2222-4222-a222-222222222222', 'collector'),
    ('99999999-9999-4999-a999-999999999999', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO addresses (id, user_id, title, address_line, sector, city, state, pincode, latitude, longitude, is_default)
VALUES
    ('44444444-4444-4444-a444-000000000001', '11111111-1111-4111-a111-111111111111', 'Home', 'Flat 402, Green Valley Apts, Sector 62', 'Sector 62', 'Noida', 'Uttar Pradesh', '201301', 28.6139, 77.2090, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO citizen_profiles (user_id, eco_points_balance, default_address_id, total_pickups_completed, total_scrap_sold_kg, total_earned_inr)
VALUES
    ('11111111-1111-4111-a111-111111111111', 840, '44444444-4444-4444-a444-000000000001', 3, 14.50, 2450.00)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO collector_profiles (user_id, vehicle_number, vehicle_type, service_area, is_available, current_status, current_latitude, current_longitude, eco_coins_balance, today_earnings, today_pickups_count, today_weight_kg, total_pickups_completed)
VALUES
    ('22222222-2222-4222-a222-222222222222', 'UP 16 AB 1234', 'Electric Three Wheeler', 'Sector 62 & 63, Noida', TRUE, 'Active', 28.6150, 77.2100, 1250, 2450.00, 7, 38.50, 142)
ON CONFLICT (user_id) DO NOTHING;

-- 6. DEMO PICKUPS
INSERT INTO pickup_requests (id, citizen_id, collector_id, status, total_estimated_price, final_verified_price, final_verified_weight, scheduled_date, time_slot, citizen_address, instructions, otp_code, collector_distance)
VALUES
    ('PK-9481', '11111111-1111-4111-a111-111111111111', '22222222-2222-4222-a222-222222222222', 'onTheWay', 118.00, 118.00, 4.60, 'Today, 18 Sep', '11 AM - 1 PM', 'Flat 402, Green Valley Apts, Sector 62, Noida', 'Ring bell twice upon arrival', '4829', '1.2 km away'),
    ('PK-8320', '11111111-1111-4111-a111-111111111111', '22222222-2222-4222-a222-222222222222', 'completed', 850.00, 850.00, 0.40, '15 Sep 2026', '2 PM - 4 PM', 'Flat 402, Green Valley Apts, Sector 62, Noida', 'Call before coming', '1942', 'Completed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pickup_items (pickup_id, category, sub_type, weight_kg, price_per_kg, estimated_total, confidence_score, notes)
VALUES
    ('PK-9481', 'Plastic', 'PET Bottles', 1.40, 50.00, 70.00, 0.940, 'Clean transparent plastic bottles'),
    ('PK-9481', 'Paper & Cardboard', 'Corrugated Boxes', 3.20, 15.00, 48.00, 0.910, 'Dry cardboard packaging boxes'),
    ('PK-8320', 'E-Waste', 'Old Smartphone & Charger', 0.40, 850.00, 850.00, 0.960, 'Complete mobile device with adapter');

-- 7. DEMO PAYMENTS
INSERT INTO payments (id, pickup_id, citizen_id, collector_id, amount, method, status, transaction_id, eco_points_earned)
VALUES
    ('PAY-901', 'PK-8320', '11111111-1111-4111-a111-111111111111', '22222222-2222-4222-a222-222222222222', 850.00, 'UPI (Google Pay)', 'SUCCESS', 'TXN948102948', 85)
ON CONFLICT (id) DO NOTHING;

-- 8. DEMO RECYCLING JOURNEY
INSERT INTO recycling_journeys (id, pickup_id, material_category, weight_kg, citizen_name, collector_name, recycler_facility, certificate_id, status)
VALUES
    ('JRN-4819', 'PK-9481', 'Plastic (PET) & Paper', 4.60, 'Aarav Sharma', 'Ramesh Kumar', 'GreenLoop Authorized Recycling Plant #4, Greater Noida', 'CERT-EK-2026-9814', 'processing')
ON CONFLICT (id) DO NOTHING;

INSERT INTO recycling_journey_steps (journey_id, step_order, title, description, location, is_completed)
VALUES
    ('JRN-4819', 1, 'Scrap Collected', 'Scrap picked up from household and weighed.', 'Sector 62, Noida', TRUE),
    ('JRN-4819', 2, 'Collector Depot Verification', 'Scrap sorted & cataloged at regional collector hub.', 'Noida Central Hub', TRUE),
    ('JRN-4819', 3, 'Dispatched to Authorized Recycler', 'Material transferred in batch #B-912 to GreenLoop.', 'Greater Noida Industrial Zone', TRUE),
    ('JRN-4819', 4, 'Recycling Recorded & Certified', 'Polymer granules produced. Circular economy completed.', 'GreenLoop Processing Plant', FALSE);

-- 9. NOTIFICATIONS
INSERT INTO notifications (id, user_id, title, message, type, is_read)
VALUES
    ('N-1', '11111111-1111-4111-a111-111111111111', 'Collector Accepted Pickup', 'Ramesh Kumar has accepted your pickup request and is on the way.', 'pickup', FALSE),
    ('N-2', '11111111-1111-4111-a111-111111111111', 'Payment Received', 'Payment of ₹118 has been transferred to your UPI account.', 'payment', TRUE),
    ('N-3', '11111111-1111-4111-a111-111111111111', 'Eco Points Earned!', 'You earned 85 Eco Points for recycling your scrap.', 'reward', TRUE),
    ('N-4', '11111111-1111-4111-a111-111111111111', 'Scrap Recycled Certificate', 'Your scrap batch #EB-4912 has been processed at EcoRecycle Hub.', 'journey', TRUE)
ON CONFLICT (id) DO NOTHING;
