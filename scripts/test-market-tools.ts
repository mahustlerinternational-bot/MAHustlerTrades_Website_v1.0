import assert from 'node:assert/strict';

import {
  MARKET_SESSIONS,
  calculateDrawdownRecovery,
  calculateExpectancy,
  calculatePortfolioRisk,
  calculateTradeOutcome,
  calculateXauPosition,
  findNextSessionTransition,
  isMarketSessionOpen,
  simulateDrawdownRisk,
} from '../src/lib/market-tools/calculations';
import {parseCalendarFeed} from '../src/lib/market-tools/calendar';
import {DEFAULT_ELITE_WORKSPACE, parseEliteWorkspace} from '../src/lib/market-tools/workspace';

const risk = calculateXauPosition({
  balance: 10_000,
  riskPercent: 1,
  entry: 4100,
  stopLoss: 4090,
  takeProfit: 4120,
});
assert.equal(risk.valid, true);
assert.equal(risk.riskBudget, 100);
assert.equal(risk.recommendedLots, 0.1);
assert.equal(risk.actualRisk, 100);
assert.equal(risk.rewardRiskRatio, 2);
assert.equal(risk.projectedProfit, 200);

const belowMinimum = calculateXauPosition({
  balance: 100,
  riskPercent: 1,
  entry: 4100,
  stopLoss: 4090,
});
assert.equal(belowMinimum.belowMinimum, true);
assert.equal(belowMinimum.recommendedLots, 0);

const tokyo = MARKET_SESSIONS.find(session => session.id === 'tokyo')!;
const sydney = MARKET_SESSIONS.find(session => session.id === 'sydney')!;
const london = MARKET_SESSIONS.find(session => session.id === 'london')!;
const newYork = MARKET_SESSIONS.find(session => session.id === 'new-york')!;

assert.equal(isMarketSessionOpen(new Date('2026-07-23T00:30:00Z'), tokyo), true);
assert.equal(isMarketSessionOpen(new Date('2026-07-23T00:30:00Z'), sydney), true);
assert.equal(isMarketSessionOpen(new Date('2026-07-23T09:00:00Z'), london), true);
assert.equal(isMarketSessionOpen(new Date('2026-07-23T13:00:00Z'), newYork), true);
assert.equal(isMarketSessionOpen(new Date('2026-07-25T13:00:00Z'), newYork), false);

const londonClose = findNextSessionTransition(new Date('2026-07-23T15:30:00Z'), london);
assert.equal(londonClose?.toISOString(), '2026-07-23T16:00:00.000Z');

assert.equal(calculateDrawdownRecovery(20)?.toFixed(2), '25.00');
assert.equal(calculateDrawdownRecovery(50), 100);
assert.equal(calculateDrawdownRecovery(100), null);

const outcome = calculateTradeOutcome({
  direction: 'buy',
  entry: 4100,
  exit: 4110,
  lotSize: .1,
  costs: 2,
});
assert.equal(outcome?.gross, 100);
assert.equal(outcome?.net, 98);

const expectancy = calculateExpectancy({
  winRatePercent: 50,
  averageWinR: 2,
  averageLossR: 1,
});
assert.equal(expectancy?.expectancyR, .5);
assert.equal(expectancy?.breakevenWinRate.toFixed(2), '33.33');

const exposure = calculatePortfolioRisk([1, .5, 1]);
assert.equal(exposure?.maximumCombinedRisk, 2.5);
assert.equal(exposure?.independentRiskEstimate.toFixed(3), '1.500');

const simulationOne = simulateDrawdownRisk({
  winRatePercent: 55,
  averageWinR: 1.5,
  averageLossR: 1,
  riskPercent: 1,
  trades: 100,
  drawdownLimitPercent: 20,
  simulations: 500,
  seed: 42,
});
const simulationTwo = simulateDrawdownRisk({
  winRatePercent: 55,
  averageWinR: 1.5,
  averageLossR: 1,
  riskPercent: 1,
  trades: 100,
  drawdownLimitPercent: 20,
  simulations: 500,
  seed: 42,
});
assert.deepEqual(simulationOne, simulationTwo);
assert.ok((simulationOne?.breachProbability ?? -1) >= 0);
assert.ok((simulationOne?.breachProbability ?? 101) <= 100);

const calendar = parseCalendarFeed([{
  title: 'CPI m/m',
  country: 'USD',
  date: '2026-07-28T08:30:00-04:00',
  impact: 'High',
  forecast: '0.3%',
  previous: '0.2%',
}]);
assert.equal(calendar[0].date, '2026-07-28T12:30:00.000Z');
assert.equal(calendar[0].goldRelevance, 'high');
assert.equal(calendar[0].actual, '—');

const workspace = parseEliteWorkspace(DEFAULT_ELITE_WORKSPACE);
assert.equal(workspace.preferences.activeTab, 'dashboard');
assert.equal(workspace.analysis.bias, 'neutral');
assert.throws(() => parseEliteWorkspace({
  ...DEFAULT_ELITE_WORKSPACE,
  preferences: {...DEFAULT_ELITE_WORKSPACE.preferences, timezone: 'x'.repeat(81)},
}));

console.log('Elite Tools calculations, simulation, calendar and workspace validation tests passed.');
