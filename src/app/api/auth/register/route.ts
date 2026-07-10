// src/app/api/auth/register/route.ts
//
// Server-side registration. We do NOT rely on the `on_auth_user_created`
// database trigger to create the matching `profiles` row — that trigger
// has proven unreliable in this Supabase project (its enabled state keeps
// reverting, likely managed by the platform). Instead we explicitly create
// both rows here, in one request, using the service-role client.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { email, password, full_name } = await req.json();

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: 'email, password, and full_name are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // 1. Create the auth user via the Admin API.
  //    email_confirm: true skips Supabase's built-in confirmation email,
  //    since that flow has its own deliverability issues on this project.
  //    (We can re-enable confirmation later if a custom SMTP is configured.)
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createErr || !created.user) {
    const msg = createErr?.message ?? 'Failed to create account';
    const isDuplicate = msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered');
    return NextResponse.json(
      { error: isDuplicate ? 'This email is already registered. Try signing in instead.' : msg },
      { status: isDuplicate ? 409 : 500 }
    );
  }

  const userId = created.user.id;

  // 2. Explicitly create the matching profiles row. If one already exists
  //    (e.g. the trigger fired for a previous attempt), this is a no-op.
  const { error: profileErr } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: userId, full_name, role: 'member' }, { onConflict: 'id' });

  if (profileErr) {
    // Roll back the auth user so we don't leave an orphaned account with no profile.
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
    return NextResponse.json({ error: 'Failed to set up account profile: ' + profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, user_id: userId });
}
