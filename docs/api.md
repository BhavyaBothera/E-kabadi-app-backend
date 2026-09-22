# E-Kabadi REST API Reference

Base URL: `http://localhost:5000/api/v1` (or deployed server URL)

All authenticated endpoints require an `Authorization: Bearer <token>` header.

---

## 1. System Health

### `GET /health`
Returns system status, uptime, active environment, and timestamp.

- **Auth**: None
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-09-22T15:20:00.000Z",
    "uptime": 124.5,
    "environment": "development"
  }
}
```

---

## 2. Authentication & User Profile

### `POST /auth/register`
Register a new citizen or collector account.

- **Auth**: None
- **Request Body**:
```json
{
  "name": "Priya Patel",
  "email": "priya.patel@example.com",
  "password": "Password123!",
  "phone": "+91 98111 22233",
  "role": "citizen"
}
```
- **Response**: `201 Created`

### `POST /auth/login`
Authenticate user with email and password.

- **Auth**: None
- **Request Body**:
```json
{
  "email": "aarav.sharma@example.com",
  "password": "Password123!",
  "role": "citizen"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "mock-citizen-001",
      "name": "Aarav Sharma",
      "phone": "+91 98765 12345",
      "email": "aarav.sharma@example.com",
      "role": "citizen",
      "address": "Flat 402, Green Valley Apts, Sector 62, Noida, UP",
      "rating": 4.8,
      "isVerified": true,
      "ecoPoints": 840,
      "ecoCoins": 0,
      "profilePhoto": ""
    }
  }
}
```

### `GET /users/me`
Retrieve current user's profile details formatted according to the Flutter `UserModel`.

- **Auth**: Bearer Token
- **Response**: `200 OK`

---

## 3. Citizen Operations

### `GET /citizens/dashboard`
Returns dashboard statistics (eco points, total sold kg, total earnings, active pickup counts, recent activity).

- **Auth**: Citizen / Admin
- **Response**: `200 OK`

### `PATCH /citizens/profile`
Update citizen name, phone, or default address.

- **Auth**: Citizen / Admin
- **Request Body**:
```json
{
  "name": "Aarav K. Sharma",
  "phone": "+91 98765 99999"
}
```

### `GET /citizens/addresses`
List all saved pickup addresses.

- **Auth**: Citizen / Admin

### `POST /citizens/addresses`
Create a new saved pickup address.

- **Auth**: Citizen / Admin
- **Request Body**:
```json
{
  "streetAddress": "Tower 4, Flat 12B, ATS Village",
  "landmark": "Near Metro Station",
  "city": "Noida",
  "postalCode": "201301",
  "latitude": 28.5355,
  "longitude": 77.3910,
  "isDefault": true
}
```

---

## 4. Collector Operations

### `PATCH /collectors/status`
Update collector availability and status (`Active`, `Offline`, `On Break`).

- **Auth**: Collector / Admin
- **Request Body**:
```json
{
  "status": "Active",
  "isAvailable": true
}
```

### `POST /collectors/location`
Broadcast GPS coordinates for geospatial proximity matching.

- **Auth**: Collector / Admin
- **Request Body**:
```json
{
  "latitude": 28.6289,
  "longitude": 77.3789
}
```

### `GET /collectors/earnings`
Get total pickups completed, total kg collected, and Eco Coins balance.

- **Auth**: Collector / Admin

### `GET /collectors/nearby?lat=28.6289&lng=77.3789&radiusKm=5`
Query available collectors nearby within radius.

- **Auth**: Any authenticated user

---

## 5. Scrap Catalog & AI Vision

### `GET /scrap/rates`
Retrieve current scrap categories and live market rate cards per kg.

- **Auth**: None

### `GET /scrap/popular`
Retrieve top frequently recycled scrap categories.

- **Auth**: None

### `POST /scrap/analyze`
Analyze an uploaded scrap image using Gemini AI or Mock AI provider.

- **Auth**: None / Authenticated
- **Request Body**:
```json
{
  "imageBase64": "data:image/jpeg;base64,...",
  "fileName": "newspaper_stack.jpg"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "detectedCategory": "Paper",
    "subCategory": "Newspaper",
    "estimatedWeightKg": 10.5,
    "confidenceScore": 0.94,
    "ratePerKg": 14.0,
    "estimatedValue": 147.0,
    "recyclabilityTips": "Keep dry and tied in stacks."
  }
}
```

---

## 6. Pickup Lifecycle

### `GET /pickups`
List pickups for current user (filtered by role).

- **Auth**: Authenticated

### `POST /pickups`
Create a new pickup request and trigger nearest collector matching.

- **Auth**: Citizen / Admin
- **Request Body**:
```json
{
  "pickupDate": "2026-09-23",
  "pickupTime": "10:00 AM - 12:00 PM",
  "address": "Sector 62, Noida",
  "notes": "Large carton box",
  "items": [
    {
      "category": "Paper",
      "subCategory": "Newspaper",
      "estimatedWeight": 10.5,
      "ratePerKg": 14.0,
      "estimatedPrice": 147.0
    }
  ]
}
```

### `GET /pickups/:id`
Get detailed pickup request including items and collector info.

- **Auth**: Authenticated

### `PATCH /pickups/:id/status`
Advance pickup lifecycle stage (`matching` -> `accepted` -> `onTheWay` -> `arrived`).

- **Auth**: Collector / Admin
- **Request Body**:
```json
{ "status": "onTheWay" }
```

### `POST /pickups/:id/verify`
Doorstep verification: confirms the 4-digit OTP and inputs actual scale weight and bill. Transitions status to `verified`.

- **Auth**: Collector / Admin
- **Request Body**:
```json
{
  "otpCode": "4829",
  "finalWeight": 11.2,
  "finalAmount": 156.8
}
```

### `POST /pickups/:id/cancel`
Cancel an active pickup request with cancellation reason.

- **Auth**: Citizen / Collector / Admin
- **Request Body**:
```json
{ "reason": "Change of plans" }
```

---

## 7. Payments & Rewards

### `POST /payments/create`
Create a payment order for a verified pickup.

- **Auth**: Citizen / Admin
- **Request Body**:
```json
{ "pickupId": "PK-9481" }
```

### `POST /payments/verify`
Cryptographically verify payment signature. Upon success, marks pickup as `completed` and credits Eco Points / Coins.

- **Auth**: Citizen / Admin
- **Request Body**:
```json
{
  "paymentId": "pay_test_12345",
  "orderId": "order_test_12345",
  "signature": "hmac_sha256_sig",
  "pickupId": "PK-9481"
}
```

### `GET /rewards/points`
Get citizen's Eco Points balance and transaction ledger.

- **Auth**: Citizen / Admin

### `GET /rewards/coins`
Get collector's Eco Coins balance and history.

- **Auth**: Collector / Admin

### `GET /rewards/coupons`
Browse available discount coupons for redemption.

- **Auth**: Any authenticated user

### `POST /rewards/redeem`
Redeem a partner coupon using Eco Points.

- **Auth**: Citizen / Admin
- **Request Body**:
```json
{ "couponId": "coup-001" }
```

---

## 8. Recycling Journey & Impact

### `GET /recycling/:id`
Get specific recycling journey by journey ID.

### `GET /recycling/pickup/:pickupId`
Get recycling journey for a completed pickup.

### `GET /impact/summary`
Get environmental metrics (total CO2 saved, trees saved, water conserved, total kg recycled).

---

## 9. Admin Operations

Protected by `requireRole('admin')`.

### `GET /admin/dashboard`
Returns high-level administrative KPI metrics and recent pickups.

### `GET /admin/citizens`
List all registered citizens with contact info and coin balances.

### `PATCH /admin/citizens/:id/coins`
Manually credit or debit citizen Eco Points with audit logging.
- **Request Body**: `{ "amount": 50, "action": "add" }`

### `GET /admin/collectors`
List all registered collectors and current statuses.

### `PATCH /admin/collectors/:id/status`
Toggle collector between `Active` and `Offline`.

### `PATCH /admin/pickups/:id/reassign`
Reassign an unaccepted or stalled pickup to a different collector.
- **Request Body**: `{ "collectorId": "col-002" }`

### `GET /admin/audit-logs`
Retrieve administrative action audit log.
