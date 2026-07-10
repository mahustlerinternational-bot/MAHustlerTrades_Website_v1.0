-- Migration 003: Ziina Payment Intents
CREATE TABLE IF NOT EXISTS payment_intents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ziina_intent_id   TEXT UNIQUE,
  type              TEXT NOT NULL CHECK (type IN ('course','package','event')),
  reference_id      UUID NOT NULL,
  amount_usd        NUMERIC(10,2) NOT NULL,
  amount_aed        NUMERIC(10,2),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','cancelled')),
  checkout_url      TEXT,
  fulfilled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own intents" ON payment_intents FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "Service role all"      ON payment_intents FOR ALL  USING (true);
CREATE INDEX IF NOT EXISTS idx_pi_user   ON payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_pi_ziina  ON payment_intents(ziina_intent_id);
