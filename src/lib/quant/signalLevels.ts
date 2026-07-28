import type {QuantSignal} from '@/types';

export interface SignalEntryZone {
  low: number;
  high: number;
  isRange: boolean;
}

export interface SignalDisplayLevels {
  entryZone: SignalEntryZone;
  takeProfits: [number | null, number | null, number | null];
  stopLoss: number;
}

const OUTCOME_LABELS:Record<string,string>={
  tp1_hit:'TP1 HIT',
  tp2_hit:'TP2 HIT',
  tp3_hit:'TP3 HIT',
  sl_hit:'SL HIT',
};

function positiveNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function metadataEntryZone(metadata: Record<string, unknown> | null | undefined) {
  const raw = metadata?.entry_zone;
  if (Array.isArray(raw)) {
    const first = positiveNumber(raw[0]);
    const second = positiveNumber(raw[1]);
    if (first !== null && second !== null) return [first, second] as const;
  }
  if (raw && typeof raw === 'object') {
    const zone = raw as Record<string, unknown>;
    const first = positiveNumber(zone.low ?? zone.min ?? zone.first);
    const second = positiveNumber(zone.high ?? zone.max ?? zone.second);
    if (first !== null && second !== null) return [first, second] as const;
  }
  const low = positiveNumber(metadata?.entry_zone_low);
  const high = positiveNumber(metadata?.entry_zone_high);
  return low !== null && high !== null ? [low, high] as const : null;
}

export function signalEntryZone(signal: Pick<QuantSignal, 'entry_price' | 'metadata'>): SignalEntryZone {
  const primary = positiveNumber(signal.entry_price) ?? 0;
  const zone = metadataEntryZone(signal.metadata);
  if (!zone) return {low: primary, high: primary, isRange: false};
  const low = Math.min(zone[0], zone[1]);
  const high = Math.max(zone[0], zone[1]);
  return {low, high, isRange: Math.abs(high - low) > Number.EPSILON};
}

export function signalTakeProfits(signal: Pick<QuantSignal, 'tp_price' | 'metadata'>) {
  const raw = signal.metadata?.take_profits;
  const parsed = Array.isArray(raw)
    ? raw.map(positiveNumber).filter((value): value is number => value !== null)
    : [];
  const primary = positiveNumber(signal.tp_price);
  if (!parsed.length && primary !== null) parsed.push(primary);
  if (primary !== null && parsed.length && Math.abs(parsed[0] - primary) > Number.EPSILON) {
    parsed.unshift(primary);
  }
  const unique = parsed.filter((value, index) =>
    parsed.findIndex(candidate => Math.abs(candidate - value) <= Number.EPSILON) === index,
  );
  return [
    unique[0] ?? null,
    unique[1] ?? null,
    unique[2] ?? null,
  ] as [number | null, number | null, number | null];
}

export function signalDisplayLevels(
  signal: Pick<QuantSignal, 'entry_price' | 'tp_price' | 'sl_price' | 'metadata'>,
): SignalDisplayLevels {
  return {
    entryZone: signalEntryZone(signal),
    takeProfits: signalTakeProfits(signal),
    stopLoss: Number(signal.sl_price),
  };
}

export function formatSignalPrice(instrument: string, value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—';
  if (value > 10_000) {
    return value.toLocaleString('en-US', {maximumFractionDigits: 2});
  }
  if (value < 10) return value.toFixed(4);
  return value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 3});
}

export function formatSignalEntryZone(
  instrument: string,
  zone: SignalEntryZone,
) {
  const low = formatSignalPrice(instrument, zone.low);
  const high = formatSignalPrice(instrument, zone.high);
  return zone.isRange ? `${low} – ${high}` : low;
}

export function signalOutcomeLabel(signal:Pick<QuantSignal,'status'|'metadata'>){
  const recorded=String(signal.metadata?.latest_outcome??'');
  if(OUTCOME_LABELS[recorded])return OUTCOME_LABELS[recorded];
  if(signal.status==='closed_tp')return 'TP HIT';
  if(signal.status==='closed_sl')return 'SL HIT';
  if(signal.status==='cancelled')return 'CANCELLED';
  if(signal.status==='closed_manual')return 'CLOSED';
  return 'AWAITING';
}
