'use client';
// src/lib/auth/store.ts
import { create } from 'zustand';

interface Profile {
  id:             string;
  member_code:    string;
  full_name:      string | null;
  avatar_url:     string | null;
  role:           string;
  package_id:     string | null;
  ib_status:      string;
  package?:       { name: string; slug: string; is_active: boolean } | null;
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
      const { supabase } = await import('@/lib/supabase/client');
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) await supabase.auth.signOut({ scope: 'local' });

      // Remove sessions created by the pre-SSR client as well as any stale
      // cookie chunks. This prevents Back/forward cache from reviving admin UI.
      if (typeof window !== 'undefined') {
        for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
          const key = window.localStorage.key(i);
          if (key?.startsWith('sb-') && key.endsWith('-auth-token')) window.localStorage.removeItem(key);
        }
        document.cookie.split(';').forEach((entry) => {
          const name = entry.split('=')[0]?.trim();
          if (name && /^sb-.+-auth-token(?:\.\d+)?$/.test(name)) {
            document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
          }
        });
      }
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
      const [{ supabase }, { getBrowserSession }] = await Promise.all([
        import('@/lib/supabase/client'),
        import('@/lib/utils/authFetch'),
      ]);

      const { data: { session }, error: sessErr } = await getBrowserSession();
      if (sessErr || !session?.user) {
        setUser(null);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, package:packages(name, slug, is_active)')
        .eq('id', session.user.id)
        .single();

      setUser(profile as Profile ?? null);

      // Listen for future auth changes
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (newSession?.user) {
          const { data: p } = await supabase
            .from('profiles')
            .select('*, package:packages(name, slug, is_active)')
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
