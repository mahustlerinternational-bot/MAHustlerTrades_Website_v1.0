import {NextRequest,NextResponse} from 'next/server';
import {requireAuthSession} from '@/lib/supabase/server';
import {createLinkCode} from '@/lib/community/linking';
import {loadIntegrationSettings} from '@/lib/integrations/settings';

export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
  const session=await requireAuthSession(req);if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {discord}=await loadIntegrationSettings();if(!discord.oauth_enabled||!discord.client_id||!discord.client_secret)return NextResponse.json({error:'Discord OAuth is not configured yet'},{status:503});
  const origin=(process.env.NEXT_PUBLIC_APP_URL&&/^https?:\/\//.test(process.env.NEXT_PUBLIC_APP_URL))?process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/,''):new URL(req.url).origin;
  const redirectUri=`${origin}/api/community/discord/callback`;
  const state=await createLinkCode(session.userId,'discord',{redirect_uri:redirectUri});
  const url=new URL('https://discord.com/oauth2/authorize');url.searchParams.set('client_id',discord.client_id);url.searchParams.set('response_type','code');url.searchParams.set('redirect_uri',redirectUri);url.searchParams.set('scope','identify email');url.searchParams.set('state',state);url.searchParams.set('prompt','consent');
  return NextResponse.redirect(url);
}
