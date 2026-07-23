import {z} from 'zod';

const nullableNumber = z.preprocess(
  value => value === '' || value === null || value === undefined ? null : Number(value),
  z.number().finite().nullable(),
);
const nullablePositive = z.preprocess(
  value => value === '' || value === null || value === undefined ? null : Number(value),
  z.number().finite().positive().nullable(),
);
const nullableText = (maximum: number) => z.preprocess(
  value => value === '' || value === null || value === undefined ? null : String(value).trim(),
  z.string().max(maximum).nullable(),
);
const stringList = z.preprocess(
  value => Array.isArray(value)
    ? value
    : String(value ?? '').split('|'),
  z.array(z.string()).transform(items => [
    ...new Set(items.map(item => item.trim()).filter(Boolean)),
  ].slice(0, 20)),
);

export const journalTradeSchema = z.object({
  symbol: z.string().trim().min(1).max(30).transform(value => value.toUpperCase()),
  direction: z.enum(['buy', 'sell']),
  trade_status: z.enum(['open', 'closed', 'cancelled']).default('closed'),
  opened_at: z.string().datetime({offset: true}),
  closed_at: z.preprocess(
    value => value === '' || value === null || value === undefined ? null : value,
    z.string().datetime({offset: true}).nullable(),
  ),
  entry_price: z.coerce.number().finite().positive(),
  exit_price: nullablePositive,
  stop_loss: nullablePositive,
  take_profit: nullablePositive,
  lot_size: z.coerce.number().finite().positive().max(1_000_000),
  net_pnl: nullableNumber,
  fees: z.coerce.number().finite().min(0).default(0),
  risk_amount: nullablePositive,
  result_r: nullableNumber,
  strategy: nullableText(100),
  setup: nullableText(120),
  timeframe: nullableText(20),
  session: nullableText(40),
  market_condition: nullableText(80),
  followed_plan: z.preprocess(
    value => value === '' || value === null || value === undefined ? null : value,
    z.boolean().nullable(),
  ),
  mistakes: stringList,
  tags: stringList,
  notes: nullableText(5000),
  rating: z.preprocess(
    value => value === '' || value === null || value === undefined ? null : Number(value),
    z.number().int().min(1).max(5).nullable(),
  ),
  external_ref: nullableText(160),
}).superRefine((trade, context) => {
  if (trade.trade_status === 'closed') {
    if (!trade.closed_at) {
      context.addIssue({code: 'custom', path: ['closed_at'], message: 'Closed trades require a closing time'});
    }
    if (trade.net_pnl === null) {
      context.addIssue({code: 'custom', path: ['net_pnl'], message: 'Closed trades require net P&L'});
    }
  }
  if (trade.closed_at && new Date(trade.closed_at) < new Date(trade.opened_at)) {
    context.addIssue({code: 'custom', path: ['closed_at'], message: 'Closing time cannot be before opening time'});
  }
});

export function parseJournalTrade(value: unknown) {
  const parsed = journalTradeSchema.parse(value);
  return {
    ...parsed,
    result_r:
      parsed.result_r ??
      (parsed.net_pnl !== null && parsed.risk_amount
        ? Number((parsed.net_pnl / parsed.risk_amount).toFixed(4))
        : null),
  };
}

export function journalValidationMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues.map(issue => `${issue.path.join('.') || 'trade'}: ${issue.message}`).join('; ');
  }
  return error instanceof Error ? error.message : 'Invalid journal trade';
}

