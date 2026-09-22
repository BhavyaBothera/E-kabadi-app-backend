# E-Kabadi Frontend Contract & Specification

This document maps the exact models, data structures, enums, business logic rules, and mock behaviors extracted from the existing Flutter application (`./frontend`). This serves as the authoritative client contract for the Node.js / TypeScript / Supabase backend (`./backend`).

---

## 1. Domain Entities & Data Models

### 1.1 User & Identity (`lib/models/user_model.dart`)

#### Frontend Model
```dart
enum UserRole { citizen, collector }

class UserModel {
  final String id;              // e.g. 'USR-7890'
  final String name;            // e.g. 'Aarav Sharma'
  final String phone;           // e.g. '+91 98765 12345'
  final String email;           // e.g. 'aarav.sharma@example.com'
  final UserRole role;          // UserRole.citizen | UserRole.collector
  final String address;         // e.g. 'Flat 402, Green Valley Apts, Sector 62, Noida, UP'
  final double rating;          // Default 4.8
  final bool isVerified;        // Default true
  final int ecoPoints;          // Default 840 (Citizen reward currency)
  final int ecoCoins;           // Default 1250 (Collector reward currency)
  final String profilePhoto;    // Default ''
}
```

#### JSON Representation
```json
{
  "id": "USR-7890",
  "name": "Aarav Sharma",
  "phone": "+91 98765 12345",
  "email": "aarav.sharma@example.com",
  "role": "citizen",
  "address": "Flat 402, Green Valley Apts, Sector 62, Noida, UP",
  "rating": 4.8,
  "isVerified": true,
  "ecoPoints": 840,
  "ecoCoins": 1250,
  "profilePhoto": ""
}
```

#### Backend Database & API Mapping
- Database tables: `profiles` (for shared auth fields), `citizen_profiles` (for citizen-specific points/default addresses), `collector_profiles` (for collector vehicle, ratings, active status, and coins).
- API mapping:
  - `GET /api/v1/users/me` returns normalized `UserModel` JSON matching these exact keys.
  - Roles supported in backend: `citizen`, `collector`, `admin`, `recycler`.

---

### 1.2 Scrap Item (`lib/models/scrap_item_model.dart`)

#### Frontend Model
```dart
class ScrapItemModel {
  final String id;               // e.g. 'SC-1' or 'AI-101'
  final String category;         // e.g. 'Plastic', 'Paper & Cardboard', 'Metal & Aluminium', 'E-Waste', 'Electronics', 'Appliances'
  final String subType;          // e.g. 'PET Bottles', 'Corrugated Boxes'
  final double weightKg;         // approximate or weighed weight
  final double pricePerKg;       // rate per kg or unit
  final double estimatedTotal;   // weightKg * pricePerKg
  final double confidenceScore;  // 0.0 to 1.0 (from AI scan)
  final String notes;            // AI detection notes or user comment
}
```

#### JSON Representation
```json
{
  "id": "AI-101",
  "category": "Plastic",
  "subType": "PET Bottles & Containers",
  "weightKg": 1.4,
  "pricePerKg": 50.0,
  "estimatedTotal": 70.0,
  "confidenceScore": 0.94,
  "notes": "Clean transparent plastic bottles detected."
}
```

#### Backend Mapping
- Stored as line items in `pickup_items` table linked to `pickup_requests`.
- Handled during AI scanning in `scrap_analyses`.
- Rate per kg is authoritatively verified by the backend against `rate_cards`.

---

### 1.3 Pickup Request (`lib/models/pickup_request_model.dart`)

#### Frontend Model
```dart
enum PickupStatus {
  pending,
  accepted,
  onTheWay,
  arrived,
  verified,
  completed,
  cancelled,
}

class PickupRequestModel {
  final String id;                   // e.g. 'PK-9481'
  final String citizenId;            // e.g. 'USR-7890'
  final String citizenName;          // e.g. 'Aarav Sharma'
  final String citizenAddress;       // e.g. 'Flat 402, Green Valley Apts, Sector 62, Noida'
  final String citizenPhone;         // e.g. '+91 98765 12345'
  final List<ScrapItemModel> items;  // Scrap items list
  final PickupStatus status;         // Enum status
  final double totalEstimatedPrice;  // Estimated total from items
  final double finalVerifiedPrice;   // Set on verification (e.g. 118.0)
  final double finalVerifiedWeight;  // Set on verification (e.g. 4.6)
  final String scheduledDate;        // e.g. 'Today, 18 Sep'
  final String timeSlot;             // e.g. '11 AM - 1 PM'
  final String instructions;         // e.g. 'Ring bell twice upon arrival'
  final String collectorId;          // e.g. 'COL-892'
  final String collectorName;        // e.g. 'Ramesh Kumar'
  final String collectorPhone;       // e.g. '+91 98765 43210'
  final double collectorRating;      // e.g. 4.8
  final String collectorDistance;    // e.g. '1.2 km' or '1.2 km away'
  final String otpCode;              // e.g. '4829' (4-digit verification code)
  final String createdAt;            // e.g. '10:15 AM'
}
```

#### Status Transition Graph
```text
pending  ──>  matching  ──>  accepted  ──>  onTheWay  ──>  arrived  ──>  verified  ──>  completed
   │              │              │             │            │            │
   └──────────────┴──────────────┴─────────────┴────────────┴────────────┴───>  cancelled
```

#### Backend Database & API Mapping
- Table: `pickup_requests` + `pickup_items` + `pickup_status_history`.
- Status values serialized as exact camelCase string tokens:
  `"pending"`, `"matching"`, `"accepted"`, `"onTheWay"`, `"arrived"`, `"verified"`, `"completed"`, `"cancelled"`.
- Backend enforces state transition constraints via validation middleware and a PostgreSQL trigger.

---

### 1.4 Payment (`lib/models/payment_model.dart`)

#### Frontend Model
```dart
class PaymentModel {
  final String id;               // e.g. 'PAY-901'
  final String pickupId;         // e.g. 'PK-8320'
  final double amount;           // Verified bill amount (e.g. 850.0)
  final String method;           // Default 'UPI / GPay'
  final String status;           // Default 'SUCCESS'
  final String transactionId;    // e.g. 'TXN948102948'
  final String timestamp;        // e.g. '15 Sep 2026, 02:45 PM'
  final int ecoPointsEarned;     // Points awarded to citizen based on rules
}
```

#### Backend Database & API Mapping
- Table: `payments` + `payment_events`.
- Authoritative amount comes from `pickup_requests.final_verified_price`.
- Never trust frontend-supplied amounts or success flags.
- Supports both Razorpay provider and MockPaymentProvider for testing.

---

### 1.5 Rewards & Rules (`lib/services/reward_rules_service.dart`)

#### Strict Business Rules
1. **Citizen "Eco Points"**:
   - Minimum threshold: Final verified bill $\ge ₹500$.
   - Bill $< ₹500 \implies 0$ points (no partial points).
   - Bill $\ge ₹500 \implies \lfloor \text{Final Bill} \times 0.10 \rfloor$.
   - Example: ₹430 $\to$ 0 points; ₹500 $\to$ 50 points; ₹850 $\to$ 85 points; ₹1,200 $\to$ 120 points.
2. **Collector "Eco Coins"**:
   - Awarded on **every completed transaction** (no minimum threshold).
   - Value: $\lfloor \text{Transaction Amount} \times 0.10 \rfloor$.
   - Example: ₹200 $\to$ 20 coins; ₹450 $\to$ 45 coins; ₹1,000 $\to$ 100 coins.
3. **Calculation Basis**:
   - Both are strictly calculated on the backend from the **final verified bill amount** (`final_verified_price`), never from approximate or AI estimated figures.
4. **Ledger Immutability**:
   - Implemented as an append-only transaction ledger in `reward_transactions` with `(user_id, source, reference_id)` unique constraint to ensure idempotency.

#### Frontend Models
- `EcoPointModel` (`id`, `points`, `type`, `title`, `description`, `timestamp`).
- `EcoCoinModel` (`id`, `coins`, `title`, `description`, `category`, `isCredit`, `timestamp`).
- `RewardCoupon` (`id`, `title`, `description`, `pointsCost`, `partnerName`, `couponCode`, `expiryDate`).

---

### 1.6 Recycling Journey (`lib/models/recycling_journey_model.dart`)

#### Frontend Model
```dart
class JourneyStep {
  final String title;
  final String description;
  final String location;
  final String timestamp;
  final bool isCompleted;
}

class RecyclingJourneyModel {
  final String id;                    // e.g. 'JRN-4819'
  final String pickupId;              // e.g. 'PK-9481'
  final String materialCategory;       // e.g. 'Plastic (PET) & Paper'
  final double weightKg;              // e.g. 4.6
  final String citizenName;           // e.g. 'Aarav Sharma'
  final String collectorName;         // e.g. 'Ramesh Kumar'
  final String recyclerFacility;      // e.g. 'GreenLoop Authorized Recycling Plant #4'
  final String certificateId;         // e.g. 'CERT-EK-2026-9814'
  final List<JourneyStep> steps;      // 4-step chronological audit trace
}
```

#### Standard Journey Steps
1. **Scrap Collected**: Scrap picked up from household and weighed.
2. **Collector Depot Verification**: Scrap sorted & cataloged at regional collector hub.
3. **Dispatched to Authorized Recycler**: Material transferred in batch to recycler facility.
4. **Recycling Recorded & Certified**: Polymer granules / raw materials produced; circular economy certified.

---

### 1.7 Notifications (`lib/models/notification_model.dart`)

#### Frontend Model
```dart
class NotificationModel {
  final String id;
  final String title;
  final String message;
  final String timestamp;
  final bool isRead;
  final String type; // 'pickup', 'payment', 'reward', 'journey'
}
```

---

## 2. Mock Services Replacement Map

| Flutter Mock Class | File | Target Backend Endpoint | Notes |
|---|---|---|---|
| `MockAuthRepository` | `auth_repository.dart` | `POST /api/v1/auth/login`<br>`POST /api/v1/auth/verify-otp`<br>`POST /api/v1/auth/role`<br>`GET /api/v1/users/me` | Replaces in-memory user with Supabase Auth + JWT |
| `MockAiService` | `ai_service.dart` | `POST /api/v1/scrap/analyze` | Multi-category detection using Gemini + fallback Mock provider |
| `MockScrapRepository` | `scrap_repository.dart` | `GET /api/v1/scrap/rates`<br>`GET /api/v1/scrap/popular` | Authoritative rates from database `rate_cards` |
| `MockMapsService` | `maps_service.dart` | `GET /api/v1/collectors/nearby`<br>`GET /api/v1/navigation/route` | Haversine proximity + Google Maps Directions provider |
| `MockPickupRepository` | `pickup_repository.dart` | `POST /api/v1/pickups`<br>`GET /api/v1/pickups`<br>`PATCH /api/v1/pickups/:id/status`<br>`POST /api/v1/pickups/:id/verify` | State machine with dual backend & PostgreSQL trigger enforcement |
| `MockPaymentService` & `MockPaymentRepository` | `payment_service.dart`<br>`payment_repository.dart` | `POST /api/v1/payments/create`<br>`POST /api/v1/payments/verify`<br>`GET /api/v1/payments` | Razorpay webhook/signature verification + fallback mock |
| `MockRewardsRepository` | `rewards_repository.dart` | `GET /api/v1/rewards/points`<br>`GET /api/v1/rewards/coins`<br>`GET /api/v1/rewards/coupons`<br>`POST /api/v1/rewards/redeem` | Append-only reward ledger with ₹500 rule enforcement |
| `MockNotificationService` | `notification_service.dart` | `GET /api/v1/notifications`<br>`PATCH /api/v1/notifications/:id/read` | Persistent PostgreSQL notification records |
