'use client';

import {useCallback, useEffect, useState} from 'react';

import type {MarketCalendarEvent} from '@/lib/market-tools/calendar';
import {authFetch} from '@/lib/utils/authFetch';

export function useMarketCalendar(enabled = true) {
  const [events, setEvents] = useState<MarketCalendarEvent[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [limitations, setLimitations] = useState('');

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const response = await authFetch('/api/me/market-tools/calendar');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Calendar could not be loaded');
      setEvents(Array.isArray(result.events) ? result.events : []);
      setFetchedAt(result.fetchedAt ?? null);
      setLimitations(result.limitations ?? '');
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Calendar could not be loaded');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {events, loading, error, fetchedAt, limitations, refresh};
}
