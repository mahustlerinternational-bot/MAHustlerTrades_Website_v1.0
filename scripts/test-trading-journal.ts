import assert from 'node:assert/strict';

import {
  groupedAnalysis,
  mistakeAnalysis,
  periodPerformance,
  summarizeJournal,
} from '../src/lib/journal/analytics';
import {journalCsvToObjects, journalTradesToCsv} from '../src/lib/journal/csv';
import {parseJournalTrade} from '../src/lib/journal/validation';
import type {JournalTrade} from '../src/types/journal';

function trade(patch: Partial<JournalTrade>): JournalTrade {
  return {
    id: crypto.randomUUID(),
    user_id: '00000000-0000-0000-0000-000000000001',
    symbol: 'XAUUSD',
    direction: 'buy',
    trade_status: 'closed',
    opened_at: '2026-07-20T08:00:00.000Z',
    closed_at: '2026-07-20T09:00:00.000Z',
    entry_price: 4100,
    exit_price: 4110,
    stop_loss: 4095,
    take_profit: 4110,
    lot_size: 0.1,
    net_pnl: 100,
    fees: 0,
    risk_amount: 50,
    result_r: 2,
    strategy: 'London Breakout',
    setup: 'CRT Sweep',
    timeframe: 'M15',
    session: 'London',
    market_condition: 'Trending Bull',
    followed_plan: true,
    mistakes: [],
    tags: ['gold'],
    notes: null,
    rating: 5,
    source: 'manual',
    external_ref: null,
    screenshots: [],
    created_at: '2026-07-20T09:01:00.000Z',
    updated_at: '2026-07-20T09:01:00.000Z',
    ...patch,
  };
}

const trades = [
  trade({net_pnl: 100, result_r: 2}),
  trade({
    opened_at: '2026-07-21T08:00:00.000Z',
    closed_at: '2026-07-21T09:00:00.000Z',
    net_pnl: -50,
    result_r: -1,
    setup: 'News Fade',
    followed_plan: false,
    mistakes: ['FOMO', 'Over-risk'],
  }),
  trade({
    opened_at: '2026-07-22T08:00:00.000Z',
    closed_at: '2026-07-22T09:00:00.000Z',
    net_pnl: 150,
    result_r: 3,
  }),
];

const summary = summarizeJournal(trades);
assert.equal(summary.totalTrades, 3);
assert.equal(summary.wins, 2);
assert.equal(summary.losses, 1);
assert.equal(summary.netPnl, 200);
assert.equal(summary.profitFactor, 5);
assert.equal(summary.averageR, 4 / 3);
assert.ok(Math.abs(Number(summary.planAdherence) - (200 / 3)) < 1e-10);

assert.equal(periodPerformance(trades, 'daily').length, 3);
assert.equal(periodPerformance(trades, 'weekly').length, 1);
assert.equal(groupedAnalysis(trades, 'setup')[0].name, 'CRT Sweep');
assert.equal(mistakeAnalysis(trades)[0].count, 1);

const parsed = parseJournalTrade({
  symbol: ' xauusd ',
  direction: 'sell',
  trade_status: 'closed',
  opened_at: '2026-07-23T08:00:00.000Z',
  closed_at: '2026-07-23T09:00:00.000Z',
  entry_price: '4120',
  exit_price: '4110',
  lot_size: '0.1',
  net_pnl: '100',
  fees: '2',
  risk_amount: '50',
  followed_plan: true,
  mistakes: ['Early exit', 'Early exit'],
  tags: [],
});
assert.equal(parsed.symbol, 'XAUUSD');
assert.equal(parsed.result_r, 2);
assert.deepEqual(parsed.mistakes, ['Early exit']);

const csv = journalTradesToCsv(trades);
const csvObjects = journalCsvToObjects(csv);
assert.equal(csvObjects.length, 3);
assert.equal(csvObjects[0].symbol, 'XAUUSD');
assert.equal(parseJournalTrade(csvObjects[0]).net_pnl, 100);

assert.throws(() => journalCsvToObjects('symbol,direction\nXAUUSD,buy'), /opened_at/);

console.log('Trading Journal analytics, validation and CSV tests passed.');
