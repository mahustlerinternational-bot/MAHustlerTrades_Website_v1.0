# MAHustler Trades — Full-Stack Platform

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with Row Level Security
- **Realtime**: Supabase Realtime (WebSocket)
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **State**: Zustand
- **Payments**: Stripe (integration points ready)

---

## Project Structure

```
src/
├── app/
│   ├── admin/              ← Admin Panel (role-guarded)
│   │   ├── dashboard/      ← KPI overview + recent activity
│   │   ├── members/        ← Member CRUD, role/package management
│   │   ├── courses/        ← Course CRUD with image upload
│   │   ├── coupons/        ← Coupon management
│   │   ├── events/         ← Event CRUD
│   │   ├── quant/          ← Push signals + regime updates
│   │   ├── ib-registrations/ ← Review IB applications
│   │   └── settings/       ← Global site settings editor
│   │
│   ├── portal/             ← Members Portal (auth-guarded)
│   │   ├── dashboard/      ← Enrolled courses, events, live signal
│   │   ├── courses/        ← My Courses + marketplace + coupon enrollment
│   │   ├── events/         ← My Events + upcoming event registration
│   │   ├── packages/       ← Pricing tiers + purchase flow
│   │   ├── ib/             ← 4-step IB Registration Wizard
│   │   └── profile/        ← Profile settings
│   │
│   ├── quant-ai/           ← Public Quant AI page (live data)
│   ├── academy/            ← Public academy page
│   ├── events/             ← Public events page
│   └── api/                ← All API routes
│
├── components/
│   ├── admin/              ← Admin-only components
│   ├── portal/             ← Portal components (AuthModal, IBWizard, etc.)
│   └── quant-ai/           ← Quant AI sub-components
│
├── lib/
│   ├── auth/               ← Middleware, Zustand store, auth helpers
│   ├── supabase/           ← Browser + server Supabase clients
│   ├── hooks/              ← useQuantRealtime (Supabase Realtime)
│   └── utils/              ← Coupon validation, cn() helper
│
└── types/                  ← All TypeScript types

supabase/
├── migrations/
│   ├── 001_initial_schema.sql   ← All tables + RLS policies
│   └── 002_rpc_helpers.sql      ← Atomic counter RPCs + Realtime pub
└── seed/
    └── 001_seed.sql             ← Default packages, settings, demo data
```

---

## Quick Start

### 1. Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link your project
supabase login
supabase link --project-ref YOUR_PROJECT_ID

# Push all migrations
supabase db push

# Run seed data
psql "$DATABASE_URL" -f supabase/seed/001_seed.sql
```

### 2. Environment Variables

```bash
cp .env.example .env.local
# Fill in your Supabase URL, anon key, service role key, and Stripe keys
```

### 3. Supabase Storage Buckets

Create two public buckets in your Supabase dashboard:
- `course-assets` — for course logos and cover images
- `event-assets`  — for event cover images

### 4. Enable Realtime

In Supabase Dashboard → Database → Replication, enable:
- `quant_signals`
- `quant_regimes`

### 5. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Creating the First Admin

After running seed and signing up your first user:

```sql
-- Run in Supabase SQL editor
UPDATE profiles
SET role = 'admin'
WHERE id = 'your-user-uuid-here';
```

---

## Feature Reference

| Feature | Route | Notes |
|---------|-------|-------|
| Admin Dashboard | `/admin/dashboard` | Requires `role = 'admin'` |
| Member Management | `/admin/members` | CRUD + grant/revoke access |
| Course Management | `/admin/courses` | Logo, cover image, price, level, market |
| Coupon Management | `/admin/coupons` | Percent, fixed, or full discount |
| Event Management | `/admin/events` | Date, time, location, capacity, ticket price |
| Quant AI Admin | `/admin/quant` | Push live signals + regime updates |
| IB Applications | `/admin/ib-registrations` | Approve/reject + auto-grant membership |
| Site Settings | `/admin/settings` | Edit hero text, stats, IB guide content |
| Portal Login | `/portal` | JWT auth via Supabase |
| My Courses | `/portal/courses` | Enrolled courses + coupon enrollment |
| My Events | `/portal/events` | Registered events + new registrations |
| Packages | `/portal/packages` | Pricing tiers + purchase |
| IB Wizard | `/portal/ib` | 4-step guided IB registration |
| Live Quant AI | `/quant-ai` | Supabase Realtime signal + regime feed |
| Elite Access CTA | `/quant-ai` button | Auth-aware → `/portal/packages` |

---

## Stripe Integration (Production)

The payment flow stubs are in place. To complete Stripe:

1. Create a `/api/payments/create-checkout` route using `stripe.checkout.sessions.create()`
2. Create a `/api/payments/webhook` route to handle `payment_intent.succeeded`
3. On success webhook: call `POST /api/me/courses` or `POST /api/me/events` with the `payment_intent_id`
4. Update `enrollments.payment_intent_id` for reconciliation

---

## Realtime Architecture

```
Admin pushes signal
  → INSERT into quant_signals
    → Supabase Realtime broadcasts to channel 'quant-live'
      → useQuantRealtime hook receives payload
        → useQuantStore.setSignal() updates React state
          → CorePillars + QuantAI page re-render with live data
            → All subscribed members see update instantly
```
