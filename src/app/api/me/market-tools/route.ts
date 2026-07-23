import {NextRequest, NextResponse} from 'next/server';

import {requireAuthSession, supabaseAdmin} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const {data, error} = await supabaseAdmin
    .from('profiles')
    .select('role,package_id,ib_status')
    .eq('id', session.userId)
    .maybeSingle();
  if (error) return NextResponse.json({error: 'Member access could not be verified'}, {status: 500});

  const allowed =
    data?.role === 'admin' ||
    data?.ib_status === 'active' ||
    Boolean(data?.package_id);
  if (!allowed) {
    return NextResponse.json(
      {error: 'Elite Tools requires an active membership or approved Elite access'},
      {status: 403},
    );
  }

  return NextResponse.json({
    access: data?.role === 'admin' ? 'admin' : 'elite',
    symbol: 'OANDA:XAUUSD',
  });
}
