import {NextRequest, NextResponse} from 'next/server';

import {ELITE_ACCESS_ERROR, hasEliteAccess} from '@/lib/access/elite';
import {
  DEFAULT_ELITE_WORKSPACE,
  parseEliteWorkspace,
  workspaceValidationMessage,
} from '@/lib/market-tools/workspace';
import {requireAuthSession, supabaseAdmin} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function authorize(req: NextRequest) {
  const session = await requireAuthSession(req);
  if (!session) return {response: NextResponse.json({error: 'Unauthorized'}, {status: 401})};
  if (!(await hasEliteAccess(session.userId))) {
    return {response: NextResponse.json({error: ELITE_ACCESS_ERROR}, {status: 403})};
  }
  return {session};
}

export async function GET(req: NextRequest) {
  const auth = await authorize(req);
  if ('response' in auth) return auth.response;

  const {data, error} = await supabaseAdmin
    .from('elite_tool_workspaces')
    .select('preferences,analysis,updated_at')
    .eq('user_id', auth.session.userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {error: 'Elite Tools storage is not ready. Apply database migration 017.'},
      {status: 503},
    );
  }
  if (!data) return NextResponse.json({...DEFAULT_ELITE_WORKSPACE, updatedAt: null});

  try {
    const workspace = parseEliteWorkspace({
      preferences: data.preferences,
      analysis: data.analysis,
    });
    return NextResponse.json({...workspace, updatedAt: data.updated_at});
  } catch {
    return NextResponse.json({...DEFAULT_ELITE_WORKSPACE, updatedAt: data.updated_at});
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorize(req);
  if ('response' in auth) return auth.response;

  let workspace;
  try {
    workspace = parseEliteWorkspace(await req.json());
  } catch (error) {
    return NextResponse.json({error: workspaceValidationMessage(error)}, {status: 400});
  }

  const {data, error} = await supabaseAdmin
    .from('elite_tool_workspaces')
    .upsert({
      user_id: auth.session.userId,
      preferences: workspace.preferences,
      analysis: workspace.analysis,
    }, {onConflict: 'user_id'})
    .select('updated_at')
    .single();
  if (error) {
    return NextResponse.json(
      {error: 'Cloud workspace save failed. Confirm database migration 017 is applied.'},
      {status: 503},
    );
  }

  return NextResponse.json({...workspace, updatedAt: data.updated_at});
}
