-- Unified signal hub, performance tracking, and IB community invitations.

ALTER TYPE signal_source ADD VALUE IF NOT EXISTS 'ea';
ALTER TYPE signal_status ADD VALUE IF NOT EXISTS 'closed_manual';

ALTER TABLE quant_signals
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS result_r NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS result_pct NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS delivery_status JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS idx_quant_signals_external_id
  ON quant_signals(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quant_signals_closed_at
  ON quant_signals(closed_at DESC) WHERE closed_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS community_invites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL CHECK (platform IN ('telegram','discord')),
  invite_url  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','revoked','expired')),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_community_invites_user ON community_invites(user_id);
ALTER TABLE community_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own community invites" ON community_invites;
CREATE POLICY "Users read own community invites" ON community_invites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage community invites" ON community_invites;
CREATE POLICY "Admins manage community invites" ON community_invites
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS trg_community_invites_updated ON community_invites;
CREATE TRIGGER trg_community_invites_updated
  BEFORE UPDATE ON community_invites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Members need closed records for history/performance. Premium access remains
-- enforced by the server API and portal UI; admins retain full write access.
DROP POLICY IF EXISTS "Members read active signals" ON quant_signals;
DROP POLICY IF EXISTS "Authenticated members read signals" ON quant_signals;
CREATE POLICY "Authenticated members read signals" ON quant_signals
  FOR SELECT USING (auth.uid() IS NOT NULL);
