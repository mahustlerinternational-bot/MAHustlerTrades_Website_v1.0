export type JournalDirection = 'buy' | 'sell';
export type JournalTradeStatus = 'open' | 'closed' | 'cancelled';
export type JournalTradeSource = 'manual' | 'csv';

export interface JournalScreenshot {
  id: string;
  trade_id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  url?: string;
}

export interface JournalTrade {
  id: string;
  user_id: string;
  symbol: string;
  direction: JournalDirection;
  trade_status: JournalTradeStatus;
  opened_at: string;
  closed_at: string | null;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  lot_size: number;
  net_pnl: number | null;
  fees: number;
  risk_amount: number | null;
  result_r: number | null;
  strategy: string | null;
  setup: string | null;
  timeframe: string | null;
  session: string | null;
  market_condition: string | null;
  followed_plan: boolean | null;
  mistakes: string[];
  tags: string[];
  notes: string | null;
  rating: number | null;
  source: JournalTradeSource;
  external_ref: string | null;
  created_at: string;
  updated_at: string;
  screenshots: JournalScreenshot[];
}

export interface JournalTradeInput {
  symbol: string;
  direction: JournalDirection;
  trade_status: JournalTradeStatus;
  opened_at: string;
  closed_at: string | null;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  lot_size: number;
  net_pnl: number | null;
  fees: number;
  risk_amount: number | null;
  result_r: number | null;
  strategy: string | null;
  setup: string | null;
  timeframe: string | null;
  session: string | null;
  market_condition: string | null;
  followed_plan: boolean | null;
  mistakes: string[];
  tags: string[];
  notes: string | null;
  rating: number | null;
  external_ref: string | null;
}

