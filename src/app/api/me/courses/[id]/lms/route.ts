import {NextRequest, NextResponse} from 'next/server';

import {hasCourseAccess} from '@/lib/lms/access';
import {getMemberLmsState} from '@/lib/lms/memberState';
import {requireAuthSession} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const {id} = await params;
  if (!(await hasCourseAccess(session.userId, id))) {
    return NextResponse.json({error: 'An active course enrollment is required'}, {status: 403});
  }
  try {
    return NextResponse.json(await getMemberLmsState(session.userId, id));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Course could not be loaded';
    const status = /not found|unavailable/i.test(message) ? 404 : 500;
    return NextResponse.json({error: message}, {status});
  }
}
