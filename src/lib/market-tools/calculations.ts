export type TradeDirection = 'buy' | 'sell';

export interface XauRiskInput {
  balance: number;
  riskPercent: number;
  entry: number;
  stopLoss: number;
  takeProfit?: number | null;
  contractSize?: number;
  minimumLot?: number;
  lotStep?: number;
}

export interface XauRiskResult {
  valid: boolean;
  error: string | null;
  riskBudget: number;
  stopDistance: number;
  stopPoints: number;
  lossPerLot: number;
  rawLots: number;
  recommendedLots: number;
  actualRisk: number;
  actualRiskPercent: number;
  exposureOunces: number;
  rewardRiskRatio: number | null;
  projectedProfit: number | null;
  belowMinimum: boolean;
}

function finitePositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

function decimalPlaces(value: number) {
  const text = String(value);
  return text.includes('.') ? text.split('.')[1].length : 0;
}

export function calculateXauPosition(input: XauRiskInput): XauRiskResult {
  const contractSize = input.contractSize ?? 100;
  const minimumLot = input.minimumLot ?? 0.01;
  const lotStep = input.lotStep ?? 0.01;
  const empty: XauRiskResult = {
    valid: false,
    error: null,
    riskBudget: 0,
    stopDistance: 0,
    stopPoints: 0,
    lossPerLot: 0,
    rawLots: 0,
    recommendedLots: 0,
    actualRisk: 0,
    actualRiskPercent: 0,
    exposureOunces: 0,
    rewardRiskRatio: null,
    projectedProfit: null,
    belowMinimum: false,
  };

  if (![input.balance, input.riskPercent, input.entry, input.stopLoss, contractSize, minimumLot, lotStep].every(finitePositive)) {
    return {...empty, error: 'Enter positive values for balance, risk, prices and broker specifications.'};
  }
  if (input.entry === input.stopLoss) {
    return {...empty, error: 'Entry and stop-loss prices must be different.'};
  }

  const riskBudget = input.balance * (input.riskPercent / 100);
  const stopDistance = Math.abs(input.entry - input.stopLoss);
  const lossPerLot = stopDistance * contractSize;
  const rawLots = riskBudget / lossPerLot;
  const belowMinimum = rawLots < minimumLot;
  const precision = Math.max(decimalPlaces(lotStep), decimalPlaces(minimumLot));
  const steppedLots = Math.floor((rawLots + 1e-12) / lotStep) * lotStep;
  const recommendedLots = belowMinimum
    ? 0
    : Number(Math.max(minimumLot, steppedLots).toFixed(precision));
  const actualRisk = recommendedLots * lossPerLot;
  const rewardDistance =
    finitePositive(Number(input.takeProfit)) && Number(input.takeProfit) !== input.entry
      ? Math.abs(Number(input.takeProfit) - input.entry)
      : null;
  const rewardRiskRatio = rewardDistance === null ? null : rewardDistance / stopDistance;

  return {
    valid: true,
    error: null,
    riskBudget,
    stopDistance,
    stopPoints: stopDistance / 0.01,
    lossPerLot,
    rawLots,
    recommendedLots,
    actualRisk,
    actualRiskPercent: input.balance > 0 ? (actualRisk / input.balance) * 100 : 0,
    exposureOunces: recommendedLots * contractSize,
    rewardRiskRatio,
    projectedProfit: rewardRiskRatio === null ? null : actualRisk * rewardRiskRatio,
    belowMinimum,
  };
}

export interface MarketSession {
  id: 'tokyo' | 'london' | 'new-york';
  name: string;
  city: string;
  timeZone: string;
  openMinute: number;
  closeMinute: number;
}

export const MARKET_SESSIONS: MarketSession[] = [
  {id: 'tokyo', name: 'Asian Session', city: 'Tokyo', timeZone: 'Asia/Tokyo', openMinute: 9 * 60, closeMinute: 18 * 60},
  {id: 'london', name: 'London Session', city: 'London', timeZone: 'Europe/London', openMinute: 8 * 60, closeMinute: 17 * 60},
  {id: 'new-york', name: 'New York Session', city: 'New York', timeZone: 'America/New_York', openMinute: 8 * 60, closeMinute: 17 * 60},
];

const WEEKDAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(part => [part.type, part.value]),
  );
  return {
    weekday: parts.weekday,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function isMarketSessionOpen(date: Date, session: MarketSession) {
  const parts = zonedParts(date, session.timeZone);
  const localMinute = parts.hour * 60 + parts.minute;
  return WEEKDAYS.has(parts.weekday) &&
    localMinute >= session.openMinute &&
    localMinute < session.closeMinute;
}

export function getSessionLocalTime(date: Date, session: MarketSession) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: session.timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function findNextSessionTransition(date: Date, session: MarketSession) {
  const currentState = isMarketSessionOpen(date, session);
  let cursor = Math.floor(date.getTime() / 60_000) * 60_000 + 60_000;
  const limit = cursor + 8 * 24 * 60 * 60_000;
  while (cursor <= limit) {
    const candidate = new Date(cursor);
    if (isMarketSessionOpen(candidate, session) !== currentState) {
      return candidate;
    }
    cursor += 60_000;
  }
  return null;
}

