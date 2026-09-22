# E-Kabadi Backend API

> **Production-grade Node.js / TypeScript / Supabase backend for the E-Kabadi Smart Scrap Recycling Platform.**
> Developed for Hackathon Round 3 as the authoritative server companion for the fixed Flutter frontend (`./frontend`).

---

## 🌟 Highlights

- **Zero Modification to Frontend**: Fully adheres to the existing Flutter client contract (`./frontend`) as the source of truth.
- **Robust Pickup State Machine**: Strict multi-level transition engine (`pending` -> `matching` -> `accepted` -> `onTheWay` -> `arrived` -> `verified` -> `completed`) backed by application logic and PostgreSQL database triggers.
- **AI-Powered Scrap Recognition**: Integrated with Google Gemini Vision API for automated scrap classification, weight estimation, and value appraisal, with an instant offline mock provider fallback.
- **Dual-Currency Green Rewards Ledger**: Double-entry reward accounting enforcing the strict **₹500 citizen rule** (10% Eco Points only on final bills $\ge ₹500$) and collector 10% Eco Coins on every transaction.
- **Provider Abstraction Architecture**: Pluggable interfaces for Payment (Razorpay / Mock), AI (Gemini / Mock), and Maps (Google Maps / Haversine Mock).
- **Zero-Credential Local Operability**: Runs and tests 100% offline out-of-the-box without requiring live cloud database or API credentials.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Runtime & Language** | Node.js 18+, TypeScript 5 (Strict Mode) |
| **HTTP Framework** | Express 5 with Helmet, CORS, Rate-Limiter, Morgan |
| **Database** | PostgreSQL 15+ (Supabase) with 26 normalized tables, triggers, and Row Level Security (RLS) |
| **Validation** | Zod (Runtime request body, query, and parameter schema validation) |
| **Logging** | Winston with correlation `x-request-id` tracing |
| **Testing** | Vitest, Supertest (25/25 unit and integration tests passing) |
| **External Providers** | Google Gemini (`@google/genai`), Razorpay, Google Maps API |

---

## 📁 Repository Structure

```
backend/
├── docs/
│   ├── frontend-contract.md      # Exact Flutter ↔ backend field and enum mappings
│   ├── flutter-integration.md    # Guide for connecting Flutter app to backend
│   ├── architecture.md           # System design, state machines, provider architecture
│   ├── database.md               # 26-table schema, relationships, triggers, and RLS
│   ├── api.md                    # Complete REST API reference catalog
│   ├── deployment.md             # Cloud deployment guide (Render / Railway / Supabase)
│   └── testing.md                # Testing philosophy and test suite documentation
├── src/
│   ├── config/                   # Typed environment variables, constants, Supabase clients
│   ├── controllers/              # HTTP controllers for all domain entities
│   ├── db/                       # In-memory store for offline/test zero-credential mode
│   ├── integrations/             # AI, payment, and maps provider interfaces and implementations
│   │   ├── ai/                   # GeminiProvider, MockAiProvider
│   │   ├── payment/              # RazorpayProvider, MockPaymentProvider
│   │   └── maps/                 # GoogleMapsProvider, MockMapsProvider
│   ├── middleware/               # Auth, RBAC, request-id, error handling, rate limiting, validation
│   ├── routes/                   # Modular Express routers
│   ├── services/                 # Business logic, state machines, reward ledgers, matching
│   ├── utils/                    # Logger, geo helpers, custom errors, uniform API responses
│   ├── validators/               # Zod validation schemas for all inputs
│   ├── app.ts                    # Express application configuration
│   └── server.ts                 # HTTP server bootstrap and graceful shutdown
├── supabase/
│   ├── migrations/
│   │   ├── 00001_initial_schema.sql  # 26 normalized tables, triggers, indexes
│   │   └── 00002_rls_policies.sql    # Row Level Security policies
│   └── seed.sql                  # Comprehensive realistic seed dataset
├── tests/
│   ├── unit/
│   │   └── reward-rules.test.ts  # Citizen ₹500 rule and collector 10% unit tests
│   └── integration/
│       ├── pickup-flow.test.ts   # E2E pickup lifecycle from scrap to doorstep verification
│       ├── payments-rewards.test.ts # Payment verification and ledger crediting
│       └── admin.test.ts         # RBAC enforcement and administrative management
├── .env.example                  # Environment configuration template
├── package.json
└── tsconfig.json
```

---

## 🚀 Quick Start (Zero-Credential Mode)

The backend is configured to boot and run out-of-the-box in offline mode with zero initial setup:

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Create .env file from template
cp .env.example .env

# 4. Run automated test suite
npm test

# 5. Build and start development server
npm run dev
```

The server will start at `http://localhost:5000/api/v1`.
Verify server health at `http://localhost:5000/api/v1/health`.

---

## 🧪 Testing

Run the complete test suite:
```bash
npm test
```

All 25 tests in 4 test suites will execute and pass:
- `tests/unit/reward-rules.test.ts`: Citizen ₹500 rule & collector 10% rule.
- `tests/integration/pickup-flow.test.ts`: E2E pickup creation, AI vision, matching, OTP doorstep verification, state machine defense.
- `tests/integration/payments-rewards.test.ts`: Payment order creation, verification, idempotency, Eco Points/Coins crediting.
- `tests/integration/admin.test.ts`: Role-based access control, metrics, collector toggling, citizen coin adjustments, audit logs.

---

## 🔑 Demo Authentication Tokens

For local testing and API evaluation via curl or Postman, use these Bearer tokens:

| Role | Token Header | Simulated Account |
|---|---|---|
| **Citizen** | `Authorization: Bearer mock-citizen-token` | Aarav Sharma (`mock-citizen-001`) |
| **Collector** | `Authorization: Bearer mock-collector-token` | Rajesh Kumar (`mock-collector-001`) |
| **Admin** | `Authorization: Bearer mock-admin-token` | System Administrator (`mock-admin-001`) |

---

## 📚 Complete Documentation Index

- [Frontend Contract Specification](docs/frontend-contract.md)
- [Flutter Integration Guide](docs/flutter-integration.md)
- [System Architecture & State Machine Design](docs/architecture.md)
- [Database Schema & RLS Policies (26 Tables)](docs/database.md)
- [Complete REST API Reference](docs/api.md)
- [Cloud Deployment Guide](docs/deployment.md)
- [Testing Strategy & Test Catalog](docs/testing.md)
