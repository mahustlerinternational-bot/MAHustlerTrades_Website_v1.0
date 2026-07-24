import type {EmailOtpType} from '@supabase/supabase-js';
import {NextRequest, NextResponse} from 'next/server';

import {ensureMemberProfile} from '@/lib/auth/profile';
import {createSupabaseServerClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function safeNext(value: string | null) {
  return value?.startsWith('/portal') && !value.startsWith('//')
    ? value
    : '/portal/dashboard';
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get('next'));
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const supabase = await createSupabaseServerClient();

  try {
    let error = null;
    if (code) {
      ({error} = await supabase.auth.exchangeCodeForSession(code));
    } else if (tokenHash && type) {
      ({error} = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      }));
    } else {
      throw new Error('The verification link is incomplete');
    }
    if (error) throw error;

    const {data: {user}, error: userError} = await supabase.auth.getUser();
    if (userError || !user || !user.email_confirmed_at) {
      throw userError ?? new Error('Email confirmation could not be verified');
    }
    await ensureMemberProfile(
      user.id,
      String(user.user_metadata?.full_name ?? '').trim() || null,
    );

    const destination = new URL(next, url.origin);
    destination.searchParams.set('emailVerified', '1');
    return NextResponse.redirect(destination);
  } catch {
    const destination = new URL('/portal', url.origin);
    destination.searchParams.set('tab', 'login');
    destination.searchParams.set('notice', 'email-verification-failed');
    return NextResponse.redirect(destination);
  }
}
