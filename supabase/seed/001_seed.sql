-- ============================================================
-- MAHustler Trades — Seed Data
-- Run after migration 001
-- ============================================================

-- ── Site Settings ──────────────────────────────────────────
INSERT INTO site_settings (key, value, description) VALUES
('hero', '{
  "headline": "Master The Markets.",
  "subheadline": "Dominate Your Future.",
  "badge_text": "The Premier Trading Collective",
  "sub_copy": "Join an elite community of professional traders."
}', 'Home page hero section'),
('stats', '{
  "members": "12,400+",
  "volume": "$4.2B",
  "satisfaction": "94%",
  "instructors": "38",
  "courses": "200+"
}', 'Homepage statistics bar'),
('ib_guide', '{
  "steps": [
    { "title": "Create Your Broker Account", "body": "Open a live trading account with our approved broker partner. Use our exclusive referral link to qualify for IB Elite access." },
    { "title": "Fund Your Account", "body": "Deposit the minimum required amount ($100+) to activate your trading account and qualify for Elite Membership" },
    { "title": "Submit Your Details", "body": "Enter your broker name and account number below. Our team will verify your account within 24-48 hours." },
    { "title": "Access Granted", "body": "Once approved, you receive full Elite membership access at no monthly cost, as long as your account remains active." }
  ],
  "broker_name": "IC Markets",
  "referral_link": "https://icmarkets.com/?camp=MAHUSTLER",
  "min_deposit": 500
}', 'IB registration guide content'),
('quant_ai', '{
  "system_name": "MAHustler Master AI System v1.0",
  "status": "active"
}', 'Quant AI page settings');

-- ── Packages ──────────────────────────────────────────────
INSERT INTO packages (name, slug, price, billing_period, is_featured, sort_order, description) VALUES
('Starter',   'starter',   97,   'monthly', FALSE, 1, 'Perfect for those beginning their professional trading journey.'),
('Elite',     'elite',     197,  'monthly', TRUE,  2, 'Full access to all signals, live rooms, and community features.'),
('Platinum',  'platinum',  497,  'monthly', FALSE, 3, 'Institutional-grade access with 1-on-1 mentorship sessions.');

-- ── Package Features ──────────────────────────────────────
-- Starter
WITH p AS (SELECT id FROM packages WHERE slug='starter')
INSERT INTO package_features (package_id, feature_text, is_highlight, sort_order)
SELECT p.id, feat, hl, so FROM p, (VALUES
  ('Access to Academy course library',          FALSE, 1),
  ('Weekly live trading room',                  FALSE, 2),
  ('Community forum access',                    FALSE, 3),
  ('Basic market analysis feed',                FALSE, 4)
) AS t(feat, hl, so);

-- Elite
WITH p AS (SELECT id FROM packages WHERE slug='elite')
INSERT INTO package_features (package_id, feature_text, is_highlight, sort_order)
SELECT p.id, feat, hl, so FROM p, (VALUES
  ('Everything in Starter',                     FALSE, 1),
  ('Live AI Signal Feed (Telegram)',            TRUE,  2),
  ('Dynamic Caution Zone Alerts',               TRUE,  3),
  ('Quant AI — Live Order Protocol access',     TRUE,  4),
  ('VIP event priority access',                 FALSE, 5),
  ('Exclusive trade setup analysis',            FALSE, 6)
) AS t(feat, hl, so);

-- Platinum
WITH p AS (SELECT id FROM packages WHERE slug='platinum')
INSERT INTO package_features (package_id, feature_text, is_highlight, sort_order)
SELECT p.id, feat, hl, so FROM p, (VALUES
  ('Everything in Elite',                       FALSE, 1),
  ('Monthly 1-on-1 mentorship session',         TRUE,  2),
  ('Portfolio review & risk audit',             TRUE,  3),
  ('Direct analyst hotline access',             TRUE,  4),
  ('Early access to new courses',               FALSE, 5),
  ('Annual VIP Summit ticket included',         FALSE, 6)
) AS t(feat, hl, so);

-- ── Initial Quant Regime ───────────────────────────────────
INSERT INTO quant_regimes (accumulation_pct, trending_pct, distribution_pct, ranging_pct, active_regime, source)
VALUES (18, 72, 6, 14, 'Trending', 'manual');

-- ── Demo Signal ───────────────────────────────────────────
INSERT INTO quant_signals (instrument, signal_type, entry_price, tp_price, sl_price, rr_ratio, risk_pct, analysis_notes, source)
VALUES ('XAUUSD', 'long', 3241.50, 3285.00, 3225.00, 1.8, 0.45, 'Demand zone reaction at 3,240. HTF bullish bias confirmed. 4H order block holding.', 'manual');
