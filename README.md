# MAHustler Trades — Full-Stack Platform

## Tech Stack
- **Framework**: Next.js 16 (App Router, React 19)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase SSR Auth with Row Level Security
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
│   │   ├── brokers/        ← Approved IB broker catalog
│   │   ├── packages/       ← Membership + Ziina link editor
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
│   ├── 002_rpc_helpers.sql      ← Atomic counter RPCs + Realtime pub
│   ├── 003_payment_intents.sql  ← Ziina payment tracking
│   ├── 004_storage_policies.sql ← Course/avatar storage policies
│   └── 005_production_hardening.sql ← Signup, enum, and RPC repairs
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
# Fill in your Supabase URL, keys, app URL, and Ziina credentials
```

### 3. Supabase Storage Buckets

Create two public buckets in your Supabase dashboard:
- `course-assets` — for course logos and cover images
- `avatars` — for member profile images

### 4. Enable Realtime

In Supabase Dashboard → Database → Replication, enable:
- `quant_signals`
- `quant_regimes`

### 5. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3010](http://localhost:3010)

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
| IB Brokers | `/admin/brokers` | Add/edit approved brokers and referral links |
| Membership | `/admin/packages` | Edit packages, benefits, pricing, and Ziina links |
| Site Settings | `/admin/settings` | Edit hero text, stats, IB guide content |
| Portal Login | `/portal` | JWT auth via Supabase |
| My Courses | `/portal/courses` | Enrolled courses + coupon enrollment |
| My Events | `/portal/events` | Registered events + new registrations |
| Packages | `/portal/packages` | Pricing tiers + purchase |
| IB Wizard | `/portal/ib` | 4-step guided IB registration |
| Live Quant AI | `/quant-ai` | Supabase Realtime signal + regime feed |
| Elite Access CTA | `/quant-ai` button | Auth-aware → `/portal/packages` |

---

## Ziina Production Setup

1. Set `ZIINA_API_TOKEN` and a random `ZIINA_WEBHOOK_SECRET` in the deployment environment.
2. Register `https://YOUR_DOMAIN/api/payments/ziina/webhook` in Ziina using that same webhook secret.
3. Set `NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN`.
4. Apply every Supabase migration through `008_ai_support_and_identity_links.sql` before accepting registrations, payments, EA signals, or support chats.

Checkout prices are resolved server-side. The webhook validates its HMAC when configured, re-fetches the payment from Ziina, compares amount and currency, and fulfills courses, events, or memberships.

An admin may optionally enter a direct Ziina link per membership package. Direct links require manual membership confirmation unless they are also connected to the API/webhook flow.

## Signal Hub: Website + Telegram + Discord + EA

Open **Admin → Site Settings → Signal Hub** to configure:

- Telegram bot token, channel/group chat ID, and fallback invite URL.
- Discord incoming webhook URL and server invite URL.
- The EA webhook and a generated secret.

### Use the existing Telegram channel as the signal source

1. Make the configured bot an administrator of the source channel.
2. Enter the bot token and the inbound source channel (`@username` or its
   `-100...` numeric chat ID), then click **Save Receiver Settings**.
3. Set `NEXT_PUBLIC_APP_URL` to the public HTTPS website address and click
   **Activate Receiver**. Use **Check Status** to inspect Telegram delivery.
4. Enable Discord and save its incoming webhook URL if every Telegram update
   should also be relayed there.

The receiver understands the 12 QUANT-SWARM message types (online, buy/sell
opened, position/TP updates, profit/loss closes, regime, halt, disconnect,
reconnect, and daily summary). Every message is saved to `signal_feed_events`,
published through Supabase Realtime, and available to authenticated entitled
clients at `GET /api/feed/events`; this is also the feed contract for a future
Android client.

Telegram supports only one webhook per bot, and webhook delivery cannot be used
at the same time as `getUpdates`. If the EA sends with the very same bot, perform
one live channel test because Telegram may not return that bot's own outgoing
post as a `channel_post`. The direct EA endpoint below is the reliable fallback
and can broadcast to the website, Telegram, and Discord in one request.

## IB community identity verification

Approved IB members receive Telegram and Discord invitation controls in
**Portal → IB Access**. Platform identities are verified instead of trusting a
typed phone number or email address:

- Telegram creates a 15-minute one-time deep link. The member starts the bot,
  which binds the actual Telegram user ID to their signed-in website account.
  Phone numbers are not requested or stored.
- Discord uses OAuth `identify email`. The database stores the Discord user ID,
  display name, a masked email, and a one-way email hash. It never stores the
  full Discord email or OAuth access token.
- A member can disconnect either identity from IB Access and verify a replacement
  account. Their approved website IB access remains active.

For Discord, create an application in the Discord Developer Portal, add
`https://YOUR_DOMAIN/api/community/discord/callback` as an OAuth redirect, then
save its Client ID and Client Secret under **Admin → Site Settings → Signal Hub**.
For Telegram linking, re-run **Activate Receiver** after deployment so Telegram
allows private `message` updates as well as channel posts.

## AI member-support assistant

The floating assistant is available throughout the member portal. It answers
account, IB, community, membership, course, event, and signal-navigation
questions using only the signed-in member's safe account context. Members can
escalate to a human; administrators reply and manage tickets from
**Admin → AI Support**. Name, welcome copy, enable/disable status, and knowledge
instructions are editable under **Admin → Site Settings → AI Assistant**.

The default **Built-in Local** provider uses a curated platform knowledge engine
and makes no model API calls, even if an API key exists. Admins can extend its
knowledge without code under **AI Assistant** using one entry per line in this
format: `question keywords | curated answer`.

To make OpenAI available as an optional provider later, add these server-only
variables and redeploy:

```env
OPENAI_API_KEY=your_server_side_key
OPENAI_ASSISTANT_MODEL=gpt-5.4-mini
```

Never expose `OPENAI_API_KEY` through a `NEXT_PUBLIC_` variable.
The admin must then explicitly change **Answer Provider** from Built-in Local to
OpenAI; an environment key alone never activates paid calls. The provider layer
keeps Claude and custom model integrations available as future adapters.

The EA sends JSON to `POST /api/integrations/ea/signals` with either
`Authorization: Bearer YOUR_SECRET` or `X-EA-Secret: YOUR_SECRET`.

Open a signal:

```json
{"action":"open","external_id":"EA-12345","instrument":"XAUUSD","signal_type":"buy","entry_price":2350.50,"tp_price":2370,"sl_price":2340}
```

Close the same signal:

```json
{"action":"close","external_id":"EA-12345","status":"tp","closed_price":2370}
```

`external_id` should be the unique EA ticket/order ID. Repeated open requests
with the same ID are idempotent. Accepted directions are `buy`, `sell`, `long`,
and `short`; close statuses accept `tp`, `sl`, `cancelled`, or a manual close.

The website stores the signal first, broadcasts it through Supabase Realtime,
then sends Telegram and Discord messages. Per-channel delivery results are kept
on the signal record. Approved IB members receive community join buttons in
their IB portal. Telegram can generate a single-use link when the bot is a chat
administrator; Discord automatic server joining requires a separate user OAuth
consent flow with the `guilds.join` scope, so the current flow uses the admin-
configured server invite.

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
