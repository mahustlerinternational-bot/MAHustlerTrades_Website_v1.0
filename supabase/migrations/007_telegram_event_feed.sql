-- Telegram channel ingestion and a mobile-ready Realtime event feed.

CREATE TABLE IF NOT EXISTS signal_feed_events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source              TEXT NOT NULL DEFAULT 'telegram',
  external_id         TEXT NOT NULL UNIQUE,
  category            TEXT NOT NULL CHECK (category IN ('signal','trade_update','performance','risk','regime','system','alert')),
  severity            TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','success','warning','critical')),
  title               TEXT NOT NULL,
  body                TEXT NOT NULL,
  metrics             JSONB NOT NULL DEFAULT '{}',
  raw_payload         JSONB NOT NULL DEFAULT '{}',
  telegram_chat_id    TEXT,
  telegram_message_id BIGINT,
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivery_status     JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signal_feed_occurred ON signal_feed_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_feed_category ON signal_feed_events(category,occurred_at DESC);

ALTER TABLE signal_feed_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Entitled members read signal feed" ON signal_feed_events;
CREATE POLICY "Entitled members read signal feed" ON signal_feed_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id=auth.uid()
        AND (p.role='admin' OR p.ib_status='active' OR p.package_id IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS "Admins manage signal feed" ON signal_feed_events;
CREATE POLICY "Admins manage signal feed" ON signal_feed_events
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS trg_signal_feed_updated ON signal_feed_events;
CREATE TRIGGER trg_signal_feed_updated BEFORE UPDATE ON signal_feed_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE signal_feed_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
