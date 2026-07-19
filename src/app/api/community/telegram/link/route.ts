import {NextRequest,NextResponse} from 'next/server';
import {requireAuthSession} from '@/lib/supabase/server';
import {createLinkCode} from '@/lib/community/linking';
import {loadIntegrationSettings} from '@/lib/integrations/settings';

export const dynamic='force-dynamic';
export async function POST(req:NextRequest){
  const session=await requireAuthSession(req);if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
  const settings=await loadIntegrationSettings();if(!settings.telegram.enabled||!settings.telegram.bot_token)return NextResponse.json({error:'Telegram linking is not configured yet'},{status:503});
  const response=await fetch(`https://api.telegram.org/bot${settings.telegram.bot_token}/getMe`,{signal:AbortSignal.timeout(10000)});
  const result=await response.json().catch(()=>null);const username=result?.result?.username;
  if(!response.ok||!result?.ok||!username)return NextResponse.json({error:result?.description??'Could not identify Telegram bot'},{status:502});
  const token=await createLinkCode(session.userId,'telegram');
  return NextResponse.json({url:`https://t.me/${username}?start=link_${token}`,expires_in:900});
}
