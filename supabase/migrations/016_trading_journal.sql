-- Private member Trading Journal with screenshot metadata.

CREATE TABLE IF NOT EXISTS public.trading_journal_trades (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol            TEXT NOT NULL CHECK (char_length(symbol) BETWEEN 1 AND 30),
  direction         TEXT NOT NULL CHECK (direction IN ('buy','sell')),
  trade_status      TEXT NOT NULL DEFAULT 'closed' CHECK (trade_status IN ('open','closed','cancelled')),
  opened_at         TIMESTAMPTZ NOT NULL,
  closed_at         TIMESTAMPTZ,
  entry_price       NUMERIC(18,6) NOT NULL CHECK (entry_price > 0),
  exit_price        NUMERIC(18,6) CHECK (exit_price IS NULL OR exit_price > 0),
  stop_loss         NUMERIC(18,6) CHECK (stop_loss IS NULL OR stop_loss > 0),
  take_profit       NUMERIC(18,6) CHECK (take_profit IS NULL OR take_profit > 0),
  lot_size          NUMERIC(14,4) NOT NULL CHECK (lot_size > 0),
  net_pnl           NUMERIC(14,2),
  fees              NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (fees >= 0),
  risk_amount       NUMERIC(14,2) CHECK (risk_amount IS NULL OR risk_amount > 0),
  result_r          NUMERIC(10,4),
  strategy          TEXT CHECK (strategy IS NULL OR char_length(strategy) <= 100),
  setup             TEXT CHECK (setup IS NULL OR char_length(setup) <= 120),
  timeframe         TEXT CHECK (timeframe IS NULL OR char_length(timeframe) <= 20),
  session           TEXT CHECK (session IS NULL OR char_length(session) <= 40),
  market_condition  TEXT CHECK (market_condition IS NULL OR char_length(market_condition) <= 80),
  followed_plan     BOOLEAN,
  mistakes          TEXT[] NOT NULL DEFAULT '{}',
  tags              TEXT[] NOT NULL DEFAULT '{}',
  notes             TEXT CHECK (notes IS NULL OR char_length(notes) <= 5000),
  rating            SMALLINT CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  source            TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','csv')),
  external_ref      TEXT CHECK (external_ref IS NULL OR char_length(external_ref) <= 160),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT journal_closed_fields CHECK (
    trade_status <> 'closed' OR (closed_at IS NOT NULL AND net_pnl IS NOT NULL)
  ),
  CONSTRAINT journal_close_after_open CHECK (
    closed_at IS NULL OR closed_at >= opened_at
  ),
  UNIQUE (id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_external_ref
  ON public.trading_journal_trades(user_id, external_ref)
  WHERE external_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journal_user_opened
  ON public.trading_journal_trades(user_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_user_status
  ON public.trading_journal_trades(user_id, trade_status, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_user_strategy
  ON public.trading_journal_trades(user_id, strategy);

CREATE TABLE IF NOT EXISTS public.trading_journal_screenshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id      UUID NOT NULL,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL UNIQUE,
  file_name     TEXT NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 180),
  mime_type     TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','image/gif')),
  file_size     BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 5242880),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (trade_id, user_id)
    REFERENCES public.trading_journal_trades(id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journal_screenshots_trade
  ON public.trading_journal_screenshots(trade_id, created_at);

DROP TRIGGER IF EXISTS trg_trading_journal_updated ON public.trading_journal_trades;
CREATE TRIGGER trg_trading_journal_updated
  BEFORE UPDATE ON public.trading_journal_trades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.trading_journal_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_journal_screenshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members manage own journal trades" ON public.trading_journal_trades;
CREATE POLICY "Members manage own journal trades"
  ON public.trading_journal_trades FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Members manage own journal screenshots" ON public.trading_journal_screenshots;
CREATE POLICY "Members manage own journal screenshots"
  ON public.trading_journal_screenshots FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- The application creates the private journal-screenshots bucket. Storage
-- object paths always begin with the authenticated member UUID.
DROP POLICY IF EXISTS "Members manage own journal screenshot files" ON storage.objects;
CREATE POLICY "Members manage own journal screenshot files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'journal-screenshots'
    AND auth.uid()::text = split_part(name, '/', 1)
  )
  WITH CHECK (
    bucket_id = 'journal-screenshots'
    AND auth.uid()::text = split_part(name, '/', 1)
  );
