'use client';
// src/lib/auth/store.ts
import { create } from 'zustand';

interface Profile {
  id:             string;
  full_name:      string | null;
  avatar_url:     string | null;
  role:           string;
  package_id:     string | null;
  ib_status:      string;
  package?:       { name: string; slug: string } | null;
  [key: string]:  unknown;
}

interface AuthState {
  user:       Profile | null;
  isLoading:  boolean;
  isAdmin:    boolean;
  setUser:    (user: Profile | null) => void;
  setLoading: (v: boolean) => void;
  logout:     () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:      null,
  isLoading: true,
  isAdmin:   false,

  setUser: (user) => set({
    user,
    isAdmin:   user?.role === 'admin',
    isLoading: false,
  }),

  setLoading: (isLoading) => set({ isLoading }),

  logout: async () => {
    try {
      const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs');
      const supabase = createClientComponentClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    set({ user: null, isAdmin: false, isLoading: false });
  },
}));

// ── Auth initializer hook ─────────────────────────────────────
export function useAuthInit() {
  const { setUser, setLoading } = useAuthStore();

  const init = async () => {
    setLoading(true);
    try {
      const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs');
      const supabase = createClientComponentClient();

      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !session?.user) {
        setUser(null);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, package:packages(name, slug)')
        .eq('id', session.user.id)
        .single();

      setUser(profile as Profile ?? null);

      // Listen for future auth changes
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (newSession?.user) {
          const { data: p } = await supabase
            .from('profiles')
            .select('*, package:packages(name, slug)')
            .eq('id', newSession.user.id)
            .single();
          setUser(p as Profile ?? null);
        } else {
          setUser(null);
        }
      });
    } catch (err) {
      // Supabase not configured yet (placeholder keys) — fail gracefully
      console.warn('Auth init failed (check Supabase env vars):', err);
      setUser(null);
    }
  };

  return init;
}
