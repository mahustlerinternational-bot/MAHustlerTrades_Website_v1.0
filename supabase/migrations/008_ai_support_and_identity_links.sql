-- Verified community identities and AI-assisted member support.

CREATE TABLE IF NOT EXISTS member_community_accounts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform              TEXT NOT NULL CHECK (platform IN ('telegram','discord')),
  platform_user_id      TEXT NOT NULL,
  username              TEXT,
  display_name          TEXT,
  email_hash            TEXT,
  email_masked          TEXT,
  email_matches_account BOOLEAN,
  verified_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id,platform),
  UNIQUE(platform,platform_user_id)
);

CREATE TABLE IF NOT EXISTS community_link_codes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL CHECK (platform IN ('telegram','discord')),
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_community_link_codes_lookup ON community_link_codes(token_hash,platform) WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS support_conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','escalated','closed')),
  channel         TEXT NOT NULL DEFAULT 'website' CHECK (channel IN ('website','telegram','discord')),
  title           TEXT NOT NULL DEFAULT 'Member Support',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_conversations_user ON support_conversations(user_id,last_message_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','admin','system')),
  content         TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 8000),
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation ON support_messages(conversation_id,created_at);

CREATE TABLE IF NOT EXISTS support_tickets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  subject         TEXT NOT NULL,
  assigned_to     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_open_ticket_per_conversation ON support_tickets(conversation_id) WHERE status IN ('open','in_progress');

ALTER TABLE member_community_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own community accounts" ON member_community_accounts;
CREATE POLICY "Users read own community accounts" ON member_community_accounts FOR SELECT USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "Admins manage community accounts" ON member_community_accounts;
CREATE POLICY "Admins manage community accounts" ON member_community_accounts FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users read own conversations" ON support_conversations;
CREATE POLICY "Users read own conversations" ON support_conversations FOR SELECT USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "Admins manage conversations" ON support_conversations;
CREATE POLICY "Admins manage conversations" ON support_conversations FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users read own support messages" ON support_messages;
CREATE POLICY "Users read own support messages" ON support_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM support_conversations c WHERE c.id=conversation_id AND c.user_id=auth.uid())
);
DROP POLICY IF EXISTS "Admins manage support messages" ON support_messages;
CREATE POLICY "Admins manage support messages" ON support_messages FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users read own support tickets" ON support_tickets;
CREATE POLICY "Users read own support tickets" ON support_tickets FOR SELECT USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "Admins manage support tickets" ON support_tickets;
CREATE POLICY "Admins manage support tickets" ON support_tickets FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS trg_community_accounts_updated ON member_community_accounts;
CREATE TRIGGER trg_community_accounts_updated BEFORE UPDATE ON member_community_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_support_conversations_updated ON support_conversations;
CREATE TRIGGER trg_support_conversations_updated BEFORE UPDATE ON support_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_support_tickets_updated ON support_tickets;
CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
