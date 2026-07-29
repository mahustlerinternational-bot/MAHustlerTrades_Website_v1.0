export type TradeDirection = 'buy' | 'sell';

export interface XauRiskInput {
  balance: number;
  riskPercent: number;
  entry: number;
  stopLoss: number;
  takeProfit?: number | null;
  leverage?: number;
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
  estimatedMargin: number;
  marginBalancePercent: number;
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
  const leverage = input.leverage ?? 100;
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
    estimatedMargin: 0,
    marginBalancePercent: 0,
    rewardRiskRatio: null,
    projectedProfit: null,
    belowMinimum: false,
  };

  if (![input.balance, input.riskPercent, input.entry, input.stopLoss, leverage, contractSize, minimumLot, lotStep].every(finitePositive)) {
    return {...empty, error: 'Enter positive values for balance, risk, prices, leverage and broker specifications.'};
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
  const estimatedMargin = recommendedLots * contractSize * input.entry / leverage;

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
    estimatedMargin,
    marginBalancePercent: input.balance > 0 ? (estimatedMargin / input.balance) * 100 : 0,
    rewardRiskRatio,
    projectedProfit: rewardRiskRatio === null ? null : actualRisk * rewardRiskRatio,
    belowMinimum,
  };
}

export interface MarketSession {
  id: 'sydney' | 'tokyo' | 'london' | 'new-york';
  name: string;
  city: string;
  timeZone: string;
  openMinute: number;
  closeMinute: number;
}

export const MARKET_SESSIONS: MarketSession[] = [
  {id: 'sydney', name: 'Sydney Session', city: 'Sydney', timeZone: 'Australia/Sydney', openMinute: 7 * 60, closeMinute: 16 * 60},
  {id: 'tokyo', name: 'Asian Session', city: 'Tokyo', timeZone: 'Asia/Tokyo', openMinute: 9 * 60, closeMinute: 18 * 60},
  {id: 'london', name: 'London Session', city: 'London', timeZone: 'Europe/London', openMinute: 8 * 60, closeMinute: 17 * 60},
  {id: 'new-york', name: 'New York Session', city: 'New York', timeZone: 'America/New_York', openMinute: 8 * 60, closeMinute: 17 * 60},
];

export function calculateDrawdownRecovery(drawdownPercent: number) {
  if (!Number.isFinite(drawdownPercent) || drawdownPercent < 0 || drawdownPercent >= 100) return null;
  return drawdownPercent === 0 ? 0 : (drawdownPercent / (100 - drawdownPercent)) * 100;
}

export function calculateTradeOutcome(input: {
  direction: TradeDirection;
  entry: number;
  exit: number;
  lotSize: number;
  contractSize?: number;
  costs?: number;
}) {
  const contractSize = input.contractSize ?? 100;
  const costs = input.costs ?? 0;
  if (![input.entry, input.exit, input.lotSize, contractSize].every(finitePositive) || !Number.isFinite(costs) || costs < 0) {
    return null;
  }
  const priceMove = input.direction === 'buy'
    ? input.exit - input.entry
    : input.entry - input.exit;
  const gross = priceMove * input.lotSize * contractSize;
  return {gross, net: gross - costs, priceMove};
}

export function calculateExpectancy(input: {
  winRatePercent: number;
  averageWinR: number;
  averageLossR: number;
}) {
  const winProbability = input.winRatePercent / 100;
  if (
    !Number.isFinite(winProbability) || winProbability < 0 || winProbability > 1 ||
    !finitePositive(input.averageWinR) || !finitePositive(input.averageLossR)
  ) return null;
  const lossProbability = 1 - winProbability;
  return {
    expectancyR: winProbability * input.averageWinR - lossProbability * input.averageLossR,
    breakevenWinRate: input.averageLossR / (input.averageWinR + input.averageLossR) * 100,
  };
}

export function calculatePortfolioRisk(risks: number[]) {
  const valid = risks.filter(value => Number.isFinite(value) && value >= 0);
  if (valid.length !== risks.length) return null;
  return {
    maximumCombinedRisk: valid.reduce((total, value) => total + value, 0),
    independentRiskEstimate: Math.sqrt(valid.reduce((total, value) => total + value ** 2, 0)),
  };
}

export function simulateDrawdownRisk(input: {
  winRatePercent: number;
  averageWinR: number;
  averageLossR: number;
  riskPercent: number;
  trades: number;
  drawdownLimitPercent: number;
  simulations?: number;
  seed?: number;
}) {
  const simulations = Math.min(20_000, Math.max(100, Math.round(input.simulations ?? 4_000)));
  const trades = Math.min(5_000, Math.max(1, Math.round(input.trades)));
  if (
    !Number.isFinite(input.winRatePercent) || input.winRatePercent < 0 || input.winRatePercent > 100 ||
    !finitePositive(input.averageWinR) || !finitePositive(input.averageLossR) ||
    !finitePositive(input.riskPercent) || input.riskPercent >= 100 ||
    !finitePositive(input.drawdownLimitPercent) || input.drawdownLimitPercent >= 100
  ) return null;

  let state = (input.seed ?? 20260728) >>> 0;
  const random = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
  let breaches = 0;
  const endingBalances: number[] = [];
  for (let simulation = 0; simulation < simulations; simulation += 1) {
    let balance = 100;
    let peak = 100;
    let breached = false;
    for (let trade = 0; trade < trades; trade += 1) {
      const riskAmount = balance * input.riskPercent / 100;
      balance += random() <= input.winRatePercent / 100
        ? riskAmount * input.averageWinR
        : -riskAmount * input.averageLossR;
      peak = Math.max(peak, balance);
      const drawdown = peak > 0 ? (peak - balance) / peak * 100 : 100;
      if (drawdown >= input.drawdownLimitPercent) breached = true;
    }
    if (breached) breaches += 1;
    endingBalances.push(balance);
  }
  endingBalances.sort((left, right) => left - right);
  return {
    breachProbability: breaches / simulations * 100,
    medianEndingBalance: endingBalances[Math.floor(simulations / 2)],
    simulations,
    trades,
  };
}

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
