# Production Deployment Guide

This guide outlines step-by-step instructions for deploying the E-Kabadi backend to production cloud platforms (Render, Railway, Fly.io) backed by Supabase PostgreSQL.

---

## 1. Cloud Database Setup (Supabase)

1. Create an account at [supabase.com](https://supabase.com) and create a new project (e.g. `e-kabadi-prod`).
2. Navigate to the **SQL Editor** in the Supabase Dashboard.
3. Apply the database migrations in sequence:
   - Run `backend/supabase/migrations/00001_initial_schema.sql` (Creates 26 tables, enums, indexes, and triggers).
   - Run `backend/supabase/migrations/00002_rls_policies.sql` (Applies Row Level Security policies).
   - *(Optional for staging)* Run `backend/supabase/seed.sql` to populate realistic demo data.
4. Obtain project credentials from **Project Settings -> API**:
   - `Project URL` (e.g. `https://xyzcompany.supabase.co`)
   - `anon` Public Key
   - `service_role` Secret Key (Keep strictly confidential, server-side only)

---

## 2. Environment Variables Checklist

Set the following environment variables in your cloud hosting provider dashboard:

```ini
# Application
NODE_ENV=production
PORT=5000
API_PREFIX=/api/v1
FRONTEND_ORIGIN=https://app.e-kabadi.com

# Supabase
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# AI Integration
GEMINI_API_KEY=<your-google-gemini-api-key>

# Payment Integration
RAZORPAY_KEY_ID=<your-razorpay-key-id>
RAZORPAY_KEY_SECRET=<your-razorpay-key-secret>

# Maps Integration
GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
```

---

## 3. Platform Deployment Guides

### Option A: Render (Recommended)
1. Go to [dashboard.render.com](https://dashboard.render.com) and create a new **Web Service**.
2. Connect your GitHub repository and set Root Directory to `backend`.
3. Configure service settings:
   - **Environment**: `Node`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/v1/health`
4. Add all environment variables from Section 2 in the **Environment** tab.
5. Deploy. Render will provision an HTTPS endpoint (e.g. `https://e-kabadi-backend.onrender.com`).

### Option B: Railway
1. Go to [railway.app](https://railway.app) and create a new project from your GitHub repository.
2. Under project settings, set Root Directory to `/backend`.
3. Railway automatically detects `package.json` and runs `npm run build` and `npm start`.
4. Inject your environment variables.
5. Add a custom domain or use Railway's default domain.

---

## 4. Production Hardening Checklist

- [x] **Strict CORS**: `FRONTEND_ORIGIN` is configured to only allow requests from authorized Flutter web or app domains.
- [x] **Rate Limiting**: Express rate limiter is active (100 requests per 15 minutes per IP by default).
- [x] **Zero Service Role Leaks**: `SUPABASE_SERVICE_ROLE_KEY` is never returned in any API response or committed to git.
- [x] **Cryptographic Payment Verification**: Razorpay webhook and client callbacks verify HMAC SHA256 signatures before advancing status.
- [x] **Structured Logging**: Winston logs with request IDs provide end-to-end traceability for troubleshooting.
- [x] **Health Check**: `/api/v1/health` monitor responds with 200 OK for automated cloud liveness and readiness probes.
