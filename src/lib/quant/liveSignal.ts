import type {QuantSignal} from '@/types';

export function sortSignals(signals: QuantSignal[]) {
  return [...signals].sort(
    (a, b) =>
      new Date(b.broadcasted_at).getTime() -
      new Date(a.broadcasted_at).getTime(),
  );
}

export function mergeSignalSnapshots(
  current: QuantSignal[],
  incoming: QuantSignal[],
  limit = 100,
) {
  const byId = new Map(current.map(signal => [signal.id, signal]));
  for (const signal of incoming) byId.set(signal.id, signal);
  return sortSignals([...byId.values()]).slice(0, limit);
}

export function unseenReleasedSignals(
  incoming: QuantSignal[],
  knownIds: Set<string>,
) {
  return sortSignals(incoming).filter(signal => !knownIds.has(signal.id));
}

