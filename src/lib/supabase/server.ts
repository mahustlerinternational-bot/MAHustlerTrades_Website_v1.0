// src/lib/supabase/server.ts
import { createServerComponentClient, createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies }     from 'next/headers';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export function createSupabaseServerClient() {
  return createServerComponentClient({ cookies });
}
export function createSupabaseRouteClient() {
  return createRouteHandlerClient({ cookies });
}
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession:false, autoRefreshToken:false } }
);

// ── Cookie-based session reading ──────────────────────────────────────────
//
// We do NOT use createRouteHandlerClient(...).auth.getSession() here.
// That call has proven unreliable inside Route Handlers with this
// (deprecated) auth-helpers package — it can return null even when a
// valid session cookie is present, likely due to its internal
// refresh-on-read behaviour not completing reliably in a fresh
// server-side client created per-request.
//
// Instead we read the raw Supabase auth cookie ourselves and verify the
// JWT directly via supabaseAdmin.auth.getUser(token) — the same reliable
// path already used for Bearer-token auth below. This is NOT a guess:
// the cookie name and stored format are taken directly from the installed
// @supabase/supabase-js and @supabase/auth-helpers-shared source:
//   - cookie name:  `sb-${projectRef}-auth-token` (chunked as `.0`, `.1`, ... if large)
//   - cookie value: JSON array [access_token, refresh_token, provider_token, provider_refresh_token, factors]

const SUPABASE_PROJECT_REF = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname.split('.')[0]; }
  catch { return ''; }
})();
const AUTH_COOKIE_BASE = `sb-${SUPABASE_PROJECT_REF}-auth-token`;

function readAuthCookieRaw(): string | null {
  const store = cookies();

  // Unchunked case — single cookie holds the whole value.
  const single = store.get(AUTH_COOKIE_BASE)?.value;
  if (single) return single;

  // Chunked case — combine `${base}.0`, `${base}.1`, ... in order.
  let combined = '';
  let i = 0;
  while (true) {
    const chunk = store.get(`${AUTH_COOKIE_BASE}.${i}`)?.value;
    if (!chunk) break;
    combined += chunk;
    i++;
  }
  return combined || null;
}

function extractAccessToken(rawCookieValue: string): string | null {
  try {
    const decoded = decodeURIComponent(rawCookieValue);
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed)) return parsed[0] ?? null;       // confirmed format: [access_token, ...]
    if (parsed?.access_token) return parsed.access_token;       // defensive fallback for other versions
    return null;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req?: NextRequest): Promise<{userId:string|null;role:string|null;error:string|null}> {
  try {
    // Method 1: Authorization: Bearer <token> header (e.g. external scripts, mobile clients)
    let token: string | null = null;
    const authHeader = req?.headers.get('authorization') ?? '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else {
      // Method 2: read + parse the Supabase auth cookie directly.
      const raw = readAuthCookieRaw();
      if (raw) token = extractAccessToken(raw);
    }

    if (!token) return { userId: null, role: null, error: 'No session token found' };

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return { userId: null, role: null, error: error?.message ?? 'Invalid or expired token' };

    const { data: p } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    return { userId: user.id, role: p?.role ?? 'member', error: null };
  } catch (err) {
    return { userId: null, role: null, error: String(err) };
  }
}
export async function requireAdminSession(req?: NextRequest) {
  const s = await getSessionFromRequest(req);
  if (!s.userId || s.role !== 'admin') {
    console.error('[requireAdminSession] denied:', s.error ?? `role=${s.role}`);
    return null;
  }
  return s;
}
export async function requireAuthSession(req?: NextRequest) {
  const s = await getSessionFromRequest(req);
  if (!s.userId) console.error('[requireAuthSession] denied:', s.error);
  return s.userId ? s : null;
}
