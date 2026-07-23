import assert from 'node:assert/strict';

import {
  mergeSignalSnapshots,
  unseenReleasedSignals,
} from '../src/lib/quant/liveSignal';
import type {QuantSignal} from '../src/types';

function signal(
  id: string,
  broadcastedAt: string,
  status: QuantSignal['status'] = 'active',
): QuantSignal {
  return {
    id,
    instrument: 'XAUUSD',
    signal_type: 'long',
    entry_price: 4100,
    tp_price: 4110,
    sl_price: 4095,
    rr_ratio: 2,
    risk_pct: 1,
    analysis_notes: null,
    status,
    source: 'ea',
    broadcasted_at: broadcastedAt,
    closed_at: null,
    closed_price: null,
    created_by: null,
    external_id: null,
    result_r: null,
    result_pct: null,
    delivery_status: {},
    metadata: {},
  };
}

const older = signal('older', '2026-07-24T09:00:00.000Z');
const newer = signal('newer', '2026-07-24T09:00:01.000Z');
const closedUpdate = {...older, status: 'closed_tp' as const, closed_price: 4110};

assert.deepEqual(
  mergeSignalSnapshots([older], [newer]).map(item => item.id),
  ['newer', 'older'],
);
assert.equal(mergeSignalSnapshots([older], [closedUpdate])[0].status, 'closed_tp');
assert.deepEqual(
  unseenReleasedSignals([older, newer], new Set(['older'])).map(item => item.id),
  ['newer'],
);
assert.deepEqual(
  unseenReleasedSignals([older], new Set(['older'])),
  [],
);

console.log('Live signal snapshot merge and new-release deduplication tests passed.');

