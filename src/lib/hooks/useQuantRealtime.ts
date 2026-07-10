'use client';
// src/lib/hooks/useQuantRealtime.ts
import { useEffect } from 'react';
import { create }    from 'zustand';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { QuantSignal, QuantRegime, QuantState } from '@/types';

// ── Zustand store ─────────────────────────────────────────────
export const useQuantStore = create<QuantState>((set) => ({
  activeSignal:  null,
  currentRegime: null,
  isConnected:   false,
  setSignal:    (activeSignal)  => set({ activeSignal }),
  setRegime:    (currentRegime) => set({ currentRegime }),
  setConnected: (isConnected)   => set({ isConnected }),
}));

// ── Realtime subscription hook ────────────────────────────────
export function useQuantRealtime() {
  const { setSignal, setRegime, setConnected } = useQuantStore();

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      setConnected(false);
      return;
    }
    const supabase = createClientComponentClient();

    async function loadInitial() {
      const [sigRes, regRes] = await Promise.all([
        supabase
          .from('quant_signals')
          .select('*')
          .eq('status', 'active')
          .order('broadcasted_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('quant_regimes')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (sigRes.data) setSignal(sigRes.data as QuantSignal);
      if (regRes.data) setRegime(regRes.data as QuantRegime);
    }

    loadInitial();

    const channel = supabase
      .channel('quant-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quant_signals' },
        (payload: { new: Record<string, unknown> }) => {
          setSignal(payload.new as unknown as QuantSignal);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'quant_signals' },
        (payload: { new: Record<string, unknown> }) => {
          const updated = payload.new as unknown as QuantSignal;
          if (updated.status !== 'active') setSignal(null);
          else setSignal(updated);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quant_regimes' },
        (payload: { new: Record<string, unknown> }) => {
          setRegime(payload.new as unknown as QuantRegime);
        }
      )
      .subscribe((status: string) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      setConnected(false);
    };
  }, [setSignal, setRegime, setConnected]);
}

// ── Helper: format price based on instrument ─────────────────
export function formatPrice(instrument: string, price: number): string {
  if (price > 10000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  if (price < 10) return price.toFixed(4);
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
