import type {JournalTrade} from '@/types/journal';

export type JournalPeriod = 'daily' | 'weekly' | 'monthly';

export interface JournalSummary {
  totalTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  averageR: number | null;
  expectancy: number;
  bestTrade: number;
  worstTrade: number;
  planAdherence: number | null;
  currentStreak: {kind: 'win' | 'loss' | 'none'; count: number};
  maxWinStreak: number;
  maxLossStreak: number;
}

export function closedJournalTrades(trades: JournalTrade[]) {
  return trades.filter(
    trade => trade.trade_status === 'closed' && typeof trade.net_pnl === 'number',
  );
}

export function summarizeJournal(trades: JournalTrade[]): JournalSummary {
  const closed = closedJournalTrades(trades);
  const wins = closed.filter(trade => Number(trade.net_pnl) > 0);
  const losses = closed.filter(trade => Number(trade.net_pnl) < 0);
  const breakeven = closed.length - wins.length - losses.length;
  const grossProfit = wins.reduce((sum, trade) => sum + Number(trade.net_pnl), 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + Number(trade.net_pnl), 0));
  const netPnl = closed.reduce((sum, trade) => sum + Number(trade.net_pnl), 0);
  const withR = closed.filter(trade => typeof trade.result_r === 'number');
  const withPlan = closed.filter(trade => typeof trade.followed_plan === 'boolean');
  const chronological = [...closed].sort(
    (a, b) => new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime(),
  );
  let currentKind: 'win' | 'loss' | 'none' = 'none';
  let currentCount = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let runningKind: 'win' | 'loss' | 'none' = 'none';
  let runningCount = 0;
  for (const trade of chronological) {
    const kind = Number(trade.net_pnl) > 0 ? 'win' : Number(trade.net_pnl) < 0 ? 'loss' : 'none';
    if (kind === 'none') {
      runningKind = 'none';
      runningCount = 0;
      continue;
    }
    runningCount = runningKind === kind ? runningCount + 1 : 1;
    runningKind = kind;
    if (kind === 'win') maxWinStreak = Math.max(maxWinStreak, runningCount);
    else maxLossStreak = Math.max(maxLossStreak, runningCount);
  }
  if (chronological.length) {
    for (let index = chronological.length - 1; index >= 0; index -= 1) {
      const pnl = Number(chronological[index].net_pnl);
      const kind = pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'none';
      if (kind === 'none') continue;
      if (currentKind === 'none') currentKind = kind;
      if (kind !== currentKind) break;
      currentCount += 1;
    }
  }

  return {
    totalTrades: closed.length,
    openTrades: trades.filter(trade => trade.trade_status === 'open').length,
    wins: wins.length,
    losses: losses.length,
    breakeven,
    winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
    netPnl,
    grossProfit,
    grossLoss,
    profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? null : 0,
    averageR: withR.length
      ? withR.reduce((sum, trade) => sum + Number(trade.result_r), 0) / withR.length
      : null,
    expectancy: closed.length ? netPnl / closed.length : 0,
    bestTrade: closed.length ? Math.max(...closed.map(trade => Number(trade.net_pnl))) : 0,
    worstTrade: closed.length ? Math.min(...closed.map(trade => Number(trade.net_pnl))) : 0,
    planAdherence: withPlan.length
      ? (withPlan.filter(trade => trade.followed_plan).length / withPlan.length) * 100
      : null,
    currentStreak: {kind: currentKind, count: currentCount},
    maxWinStreak,
    maxLossStreak,
  };
}

function localDateParts(value: string) {
  const date = new Date(value);
  return {date, year: date.getFullYear(), month: date.getMonth(), day: date.getDate()};
}

export function periodKey(value: string, period: JournalPeriod) {
  const {date, year, month, day} = localDateParts(value);
  if (period === 'monthly') return `${year}-${String(month + 1).padStart(2, '0')}`;
  if (period === 'daily') return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const monday = new Date(year, month, day);
  const weekday = date.getDay() || 7;
  monday.setDate(monday.getDate() - weekday + 1);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

export function periodPerformance(trades: JournalTrade[], period: JournalPeriod) {
  const groups = new Map<string, JournalTrade[]>();
  for (const trade of closedJournalTrades(trades)) {
    const key = periodKey(trade.closed_at ?? trade.opened_at, period);
    groups.set(key, [...(groups.get(key) ?? []), trade]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => ({key, ...summarizeJournal(values)}));
}

export function equityCurve(trades: JournalTrade[]) {
  let equity = 0;
  return closedJournalTrades(trades)
    .sort((a, b) => new Date(a.closed_at ?? a.opened_at).getTime() - new Date(b.closed_at ?? b.opened_at).getTime())
    .map(trade => {
      equity += Number(trade.net_pnl);
      return {id: trade.id, at: trade.closed_at ?? trade.opened_at, equity, pnl: Number(trade.net_pnl)};
    });
}

export function groupedAnalysis(trades: JournalTrade[], field: 'strategy' | 'setup') {
  const groups = new Map<string, JournalTrade[]>();
  for (const trade of closedJournalTrades(trades)) {
    const key = String(trade[field] ?? 'Unclassified').trim() || 'Unclassified';
    groups.set(key, [...(groups.get(key) ?? []), trade]);
  }
  return [...groups.entries()]
    .map(([name, values]) => ({name, ...summarizeJournal(values)}))
    .sort((a, b) => b.totalTrades - a.totalTrades);
}

export function mistakeAnalysis(trades: JournalTrade[]) {
  const groups = new Map<string, JournalTrade[]>();
  for (const trade of closedJournalTrades(trades)) {
    for (const mistake of trade.mistakes ?? []) {
      groups.set(mistake, [...(groups.get(mistake) ?? []), trade]);
    }
  }
  return [...groups.entries()]
    .map(([name, values]) => ({
      name,
      count: values.length,
      losses: values.filter(trade => Number(trade.net_pnl) < 0).length,
      netPnl: values.reduce((sum, trade) => sum + Number(trade.net_pnl), 0),
    }))
    .sort((a, b) => b.count - a.count);
}

