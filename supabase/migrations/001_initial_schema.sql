-- ============================================================
-- MAHustler Trades — Complete Database Schema
-- Migration: 001_initial_schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role       AS ENUM ('admin', 'member', 'ib_member');
CREATE TYPE ib_status       AS ENUM ('none', 'pending', 'active', 'rejected');
CREATE TYPE billing_period  AS ENUM ('monthly', 'quarterly', 'annual', 'lifetime');
CREATE TYPE discount_type   AS ENUM ('percent', 'full', 'fixed');
CREATE TYPE payment_method  AS ENUM ('stripe', 'coupon', 'admin_grant', 'ib_grant');
CREATE TYPE enroll_status   AS ENUM ('active', 'revoked', 'expired');
CREATE TYPE event_type      AS ENUM ('webinar', 'live_trading', 'summit', 'review', 'masterclass');
CREATE TYPE event_badge     AS ENUM ('Live', 'VIP', 'In-Person', 'Free');
CREATE TYPE ticket_type     AS ENUM ('free', 'standard', 'vip');
CREATE TYPE reg_status      AS ENUM ('confirmed', 'cancelled', 'waitlist', 'pending_payment');
CREATE TYPE signal_status   AS ENUM ('active', 'closed_tp', 'closed_sl', 'cancelled');
CREATE TYPE signal_type     AS ENUM ('long', 'short');
CREATE TYPE signal_source   AS ENUM ('live', 'manual');
CREATE TYPE regime_type     AS ENUM ('Accumulation', 'Trending', 'Distribution', 'Ranging');
CREATE TYPE ib_review_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================================
-- PROFILES  (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  avatar_url      TEXT,
  role            user_role     NOT NULL DEFAULT 'member',
  package_id      UUID,                           -- FK added after packages table
  ib_status       ib_status     NOT NULL DEFAULT 'none',
  ib_broker_name  TEXT,
  ib_account_ref  TEXT,
  stripe_customer_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PACKAGES  (membership tiers)
-- ============================================================
CREATE TABLE packages (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  description    TEXT,
  price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  billing_period billing_period NOT NULL DEFAULT 'monthly',
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE package_features (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id   UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  feature_text TEXT NOT NULL,
  is_highlight BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INT NOT NULL DEFAULT 0
);

-- Add FK now that packages exists
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_package
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL;

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE courses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  logo_url      TEXT,
  cover_image_url TEXT,
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  level         TEXT NOT NULL DEFAULT 'All Levels',
  market        TEXT,
  duration_hours INT,
  lesson_count  INT,
  is_published  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INT NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE course_modules (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id  UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE course_lessons (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id        UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  video_url        TEXT,
  duration_seconds INT,
  sort_order       INT NOT NULL DEFAULT 0,
  is_preview       BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================
-- COUPONS
-- ============================================================
CREATE TABLE coupons (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code           TEXT NOT NULL UNIQUE,
  description    TEXT,
  discount_type  discount_type NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,  -- % or $ or 100 for full
  course_id      UUID REFERENCES courses(id) ON DELETE SET NULL,  -- NULL = any course
  max_uses       INT,           -- NULL = unlimited
  uses_count     INT NOT NULL DEFAULT 0,
  expires_at     TIMESTAMPTZ,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ENROLLMENTS
-- ============================================================
CREATE TABLE enrollments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id         UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_method    payment_method NOT NULL,
  coupon_id         UUID REFERENCES coupons(id),
  amount_paid       NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_intent_id TEXT,        -- Stripe PaymentIntent ID
  status            enroll_status NOT NULL DEFAULT 'active',
  granted_by        UUID REFERENCES profiles(id),  -- admin who granted
  revoked_at        TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  description      TEXT,
  event_type       event_type NOT NULL DEFAULT 'webinar',
  event_date       TIMESTAMPTZ NOT NULL,
  duration_minutes INT,
  location         TEXT,
  is_virtual       BOOLEAN NOT NULL DEFAULT TRUE,
  cover_image_url  TEXT,
  capacity         INT,
  registered_count INT NOT NULL DEFAULT 0,
  ticket_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
  vip_ticket_price NUMERIC(10,2),
  badge            event_badge,
  host_name        TEXT,
  is_published     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EVENT REGISTRATIONS
-- ============================================================
CREATE TABLE event_registrations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  registered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ticket_type       ticket_type NOT NULL DEFAULT 'free',
  amount_paid       NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_intent_id TEXT,
  status            reg_status NOT NULL DEFAULT 'confirmed',
  cancelled_at      TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);

-- ============================================================
-- QUANT AI — SIGNALS
-- ============================================================
CREATE TABLE quant_signals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument      TEXT NOT NULL,
  signal_type     signal_type NOT NULL,
  entry_price     NUMERIC(14,5) NOT NULL,
  tp_price        NUMERIC(14,5) NOT NULL,
  sl_price        NUMERIC(14,5) NOT NULL,
  rr_ratio        NUMERIC(5,2),
  risk_pct        NUMERIC(5,2),
  analysis_notes  TEXT,
  status          signal_status NOT NULL DEFAULT 'active',
  source          signal_source NOT NULL DEFAULT 'manual',
  broadcasted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  closed_price    NUMERIC(14,5),
  created_by      UUID REFERENCES profiles(id)
);

-- ============================================================
-- QUANT AI — REGIMES
-- ============================================================
CREATE TABLE quant_regimes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accumulation_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
  trending_pct      NUMERIC(5,2) NOT NULL DEFAULT 0,
  distribution_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
  ranging_pct       NUMERIC(5,2) NOT NULL DEFAULT 0,
  active_regime     regime_type NOT NULL DEFAULT 'Trending',
  source            signal_source NOT NULL DEFAULT 'manual',
  created_by        UUID REFERENCES profiles(id)
);

-- ============================================================
-- IB REGISTRATIONS
-- ============================================================
CREATE TABLE ib_registrations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  broker_name    TEXT NOT NULL,
  account_number TEXT NOT NULL,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status         ib_review_status NOT NULL DEFAULT 'pending',
  reviewed_by    UUID REFERENCES profiles(id),
  reviewed_at    TIMESTAMPTZ,
  admin_notes    TEXT,
  UNIQUE(user_id)   -- one IB reg per user
);

-- ============================================================
-- SITE SETTINGS  (key-value store for editable site content)
-- ============================================================
CREATE TABLE site_settings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT NOT NULL UNIQUE,
  value       JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES profiles(id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_enrollments_user      ON enrollments(user_id);
CREATE INDEX idx_enrollments_course    ON enrollments(course_id);
CREATE INDEX idx_enrollments_status    ON enrollments(status);
CREATE INDEX idx_event_regs_user       ON event_registrations(user_id);
CREATE INDEX idx_event_regs_event      ON event_registrations(event_id);
CREATE INDEX idx_quant_signals_status  ON quant_signals(status);
CREATE INDEX idx_quant_signals_date    ON quant_signals(broadcasted_at DESC);
CREATE INDEX idx_quant_regimes_date    ON quant_regimes(recorded_at DESC);
CREATE INDEX idx_ib_regs_status        ON ib_registrations(status);
CREATE INDEX idx_courses_published     ON courses(is_published);
CREATE INDEX idx_events_date           ON events(event_date);
CREATE INDEX idx_events_published      ON events(is_published);
CREATE INDEX idx_coupons_code          ON coupons(code);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated   BEFORE UPDATE ON profiles           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_packages_updated   BEFORE UPDATE ON packages           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_courses_updated    BEFORE UPDATE ON courses            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_events_updated     BEFORE UPDATE ON events             FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_settings_updated   BEFORE UPDATE ON site_settings      FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-REGISTER PROFILE ON AUTH SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_features   ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quant_signals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quant_regimes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ib_registrations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings      ENABLE ROW LEVEL SECURITY;

-- Helper function: is the current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES
CREATE POLICY "Users read own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins full profiles"     ON profiles FOR ALL    USING (is_admin());

-- PACKAGES (public read, admin write)
CREATE POLICY "Public read packages"     ON packages         FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admin write packages"     ON packages         FOR ALL    USING (is_admin());
CREATE POLICY "Public read pkg features" ON package_features FOR SELECT USING (TRUE);
CREATE POLICY "Admin write pkg features" ON package_features FOR ALL    USING (is_admin());

-- COURSES (published = public read; admin = all)
CREATE POLICY "Public read published courses" ON courses        FOR SELECT USING (is_published = TRUE);
CREATE POLICY "Admin all courses"             ON courses        FOR ALL    USING (is_admin());
CREATE POLICY "Public read modules"           ON course_modules FOR SELECT
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.is_published));
CREATE POLICY "Admin all modules"             ON course_modules FOR ALL USING (is_admin());
CREATE POLICY "Preview or enrolled lessons"   ON course_lessons FOR SELECT
  USING (
    is_preview = TRUE OR
    is_admin() OR
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN course_modules cm ON cm.id = module_id
      WHERE e.course_id = cm.course_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- COUPONS (admin only)
CREATE POLICY "Admin all coupons" ON coupons FOR ALL USING (is_admin());

-- ENROLLMENTS
CREATE POLICY "Users read own enrollments" ON enrollments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert enrollments"   ON enrollments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin all enrollments"      ON enrollments FOR ALL    USING (is_admin());

-- EVENTS (published = public read)
CREATE POLICY "Public read published events" ON events FOR SELECT USING (is_published = TRUE);
CREATE POLICY "Admin all events"             ON events FOR ALL    USING (is_admin());

-- EVENT REGISTRATIONS
CREATE POLICY "Users read own event regs"   ON event_registrations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert event regs"     ON event_registrations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin all event regs"        ON event_registrations FOR ALL    USING (is_admin());

-- QUANT SIGNALS (members read active; admin all)
CREATE POLICY "Members read active signals" ON quant_signals FOR SELECT
  USING (status = 'active' AND auth.uid() IS NOT NULL);
CREATE POLICY "Admin all signals"           ON quant_signals FOR ALL USING (is_admin());

-- QUANT REGIMES
CREATE POLICY "Members read regimes"        ON quant_regimes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin all regimes"           ON quant_regimes FOR ALL   USING (is_admin());

-- IB REGISTRATIONS
CREATE POLICY "Users read own ib reg"       ON ib_registrations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert ib reg"         ON ib_registrations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin all ib regs"           ON ib_registrations FOR ALL    USING (is_admin());

-- SITE SETTINGS (admin only)
CREATE POLICY "Admin all settings"          ON site_settings FOR ALL USING (is_admin());
