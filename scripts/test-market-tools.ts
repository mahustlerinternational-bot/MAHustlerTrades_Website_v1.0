import assert from 'node:assert/strict';

import {
  MARKET_SESSIONS,
  calculateXauPosition,
  findNextSessionTransition,
  isMarketSessionOpen,
} from '../src/lib/market-tools/calculations';

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
const london = MARKET_SESSIONS.find(session => session.id === 'london')!;
const newYork = MARKET_SESSIONS.find(session => session.id === 'new-york')!;

assert.equal(isMarketSessionOpen(new Date('2026-07-23T00:30:00Z'), tokyo), true);
assert.equal(isMarketSessionOpen(new Date('2026-07-23T09:00:00Z'), london), true);
assert.equal(isMarketSessionOpen(new Date('2026-07-23T13:00:00Z'), newYork), true);
assert.equal(isMarketSessionOpen(new Date('2026-07-25T13:00:00Z'), newYork), false);

const londonClose = findNextSessionTransition(new Date('2026-07-23T15:30:00Z'), london);
assert.equal(londonClose?.toISOString(), '2026-07-23T16:00:00.000Z');

console.log('Market Tools calculation and DST session tests passed.');

