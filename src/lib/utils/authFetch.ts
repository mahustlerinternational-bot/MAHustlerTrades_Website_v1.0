'use client';

import { supabase } from '@/lib/supabase/client';

/**
 * Return the current cookie-backed session. Accounts that signed in before the
 * @supabase/ssr migration can still have a valid session in localStorage; move
 * that session into the cookie store once so Proxy and Route Handlers see it.
 */
export async function getBrowserSession() {
  const current = await supabase.auth.getSession();
  if (current.error || current.data.session || typeof window === 'undefined') return current;

  try {
    const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0];
    const legacyKey = `sb-${projectRef}-auth-token`;
    const raw = window.localStorage.getItem(legacyKey);
    if (!raw) return current;

    const legacy = JSON.parse(raw) as { access_token?: unknown; refresh_token?: unknown };
    if (typeof legacy.access_token !== 'string' || typeof legacy.refresh_token !== 'string') return current;

    const restored = await supabase.auth.setSession({
      access_token: legacy.access_token,
      refresh_token: legacy.refresh_token,
    });
    if (restored.data.session && !restored.error) window.localStorage.removeItem(legacyKey);
    return restored;
  } catch {
    return current;
  }
}

/**
 * Same-origin fetch for authenticated portal/admin APIs.
 *
 * The Supabase auth helpers store the browser session in cookies, but relying
 * on a Route Handler to rediscover those cookies proved brittle across local,
 * preview, and proxied production deployments. Sending the already-available
 * access token explicitly makes the request deterministic. The server still
 * verifies the token with Supabase before trusting the user or role.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data, error } = await getBrowserSession();
  if (error) throw new Error(error.message);
  if (!data.session?.access_token) throw new Error('Your session has expired. Please sign in again.');

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${data.session.access_token}`);

  return fetch(input, {
    ...init,
    credentials: 'same-origin',
    headers,
  });
}
