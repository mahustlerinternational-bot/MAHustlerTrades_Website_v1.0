import {NextRequest, NextResponse} from 'next/server';

import {ELITE_ACCESS_ERROR, hasEliteAccess} from '@/lib/access/elite';
import {requireAuthSession} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  if (!(await hasEliteAccess(session.userId))) {
    return NextResponse.json({error: ELITE_ACCESS_ERROR}, {status: 403});
  }

  return NextResponse.json({
    access: session.role === 'admin' ? 'admin' : 'elite',
    symbol: 'OANDA:XAUUSD',
  });
}
