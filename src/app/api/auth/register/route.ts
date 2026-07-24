import {NextRequest, NextResponse} from 'next/server';

import {ensureMemberProfile} from '@/lib/auth/profile';
import {requireAuthSession, supabaseAdmin} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Finalize or repair the public profile only after Supabase has verified the
// email and issued an authenticated session. Account creation itself happens
// through supabase.auth.signUp in the browser so Supabase can send and enforce
// its native confirmation email.
export async function POST(req: NextRequest) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  try {
    const body = await req.json().catch(() => ({}));
    const authResult = await supabaseAdmin.auth.admin.getUserById(session.userId);
    if (authResult.error || !authResult.data.user) {
      return NextResponse.json({error: 'Authentication account not found'}, {status: 404});
    }
    const user = authResult.data.user;
    if (!user.email_confirmed_at) {
      return NextResponse.json(
        {error: 'Verify your email address before activating your profile'},
        {status: 403},
      );
    }

    const requestedName = String(body.full_name ?? '').trim();
    const metadataName = String(user.user_metadata?.full_name ?? '').trim();
    const fullName = (requestedName || metadataName).slice(0, 120);
    const profile = await ensureMemberProfile(user.id, fullName || null);
    return NextResponse.json({success: true, profile});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Profile activation failed'},
      {status: 500},
    );
  }
}
