# Testing Strategy & Test Suite Documentation

This document describes the testing strategy, test suites, and verification commands for the E-Kabadi backend.

---

## 1. Testing Philosophy

The testing framework is built around three core pillars:
1. **Zero External Dependencies**: Tests run completely offline without needing live Supabase, Razorpay, or Gemini credentials, enabling instant execution and reliable CI/CD pipelines.
2. **Behavior & Contract Verification**: All assertions directly test against the frontend contract specified in `./frontend`.
3. **Defense-in-Depth**: Unit and integration tests verify positive workflows, role authorization limits, and illegal state transition rejections.

---

## 2. Test Suites Overview

### 2.1 Unit Tests (`tests/unit/`)

#### `tests/unit/reward-rules.test.ts`
- **Citizen ₹500 Threshold**: Verifies that any bill $< ₹500$ (e.g. ₹0, ₹50, ₹118, ₹499.99) awards **0 Eco Points**.
- **Citizen 10% Rate**: Verifies that bills $\ge ₹500$ (e.g. ₹500, ₹750, ₹1000, ₹1280) award exactly 10% rounded down.
- **Collector 10% Rule**: Verifies that collectors receive 10% Eco Coins on any positive transaction without threshold.
- **Constants Alignment**: Verifies that `REWARD_RATE = 0.1` and `CITIZEN_MIN_BILL_FOR_POINTS = 500`.

### 2.2 Integration Tests (`tests/integration/`)

#### `tests/integration/pickup-flow.test.ts` (7 Tests)
- **Step 1**: System health check verification (`/health`).
- **Step 2**: Scrap catalog discovery and AI image classification (`/scrap/rates`, `/scrap/analyze`).
- **Step 3**: Citizen creates pickup request (`POST /pickups`) and triggers nearest collector matching.
- **Step 4**: Collector accepts pickup and advances status (`PATCH /pickups/:id/status` to `accepted`, `onTheWay`, `arrived`).
- **Step 5**: Doorstep verification (`POST /pickups/:id/verify`) with OTP check and final weight/amount entry.
- **Step 6**: Complete lifecycle state progression validation.
- **Step 7**: State machine defense test: Rejects illegal backward transition (`verified` -> `pending`) with HTTP 400.

#### `tests/integration/payments-rewards.test.ts` (6 Tests)
- **Step 1**: Pickup preparation to `arrived` and `verified` state.
- **Step 2**: Payment order creation (`POST /payments/create`).
- **Step 3**: Payment verification on sub-₹500 bill (₹118 bill yields 0 citizen points).
- **Step 4**: Idempotency check: duplicate verification attempts return existing transaction.
- **Step 5**: Payment verification on $\ge ₹500$ bill (₹850 bill yields 85 citizen points).
- **Step 6**: Coupon browsing and points redemption.

#### `tests/integration/admin.test.ts` (8 Tests)
- **1. Unauthenticated rejection**: HTTP 401.
- **2. Citizen forbidden**: HTTP 403.
- **3. Collector forbidden**: HTTP 403.
- **4. Admin metrics**: Dashboard stats overview.
- **5. Citizen management**: Fetch citizens and modify coin balance.
- **6. Collector management**: Fetch collectors and toggle status (`Active` <-> `Offline`).
- **7. Pickup reassignment**: Reallocate pickup to another collector.
- **8. Audit logs**: View privileged administrative action logs.

---

## 3. Running the Test Suite

Execute all tests:
```bash
npm test
```

Run tests with watch mode during development:
```bash
npx vitest
```

Run a specific test suite:
```bash
npx vitest run tests/unit/reward-rules.test.ts
```

Check TypeScript compilation:
```bash
npm run build
```
