import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuthSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const s = await requireAuthSession(req);
  if (!s?.userId) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  const { data, error } = await supabaseAdmin.from('ib_registrations').select('*').eq('user_id',s.userId).order('submitted_at',{ ascending:false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data??null);
}
export async function POST(req: NextRequest) {
  const s = await requireAuthSession(req);
  if (!s?.userId) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  const { broker_name, account_number } = await req.json();
  if (!broker_name||!account_number) return NextResponse.json({ error:'broker_name and account_number required' },{ status:400 });
  const requestedBroker = String(broker_name).trim();
  const accountNumber = String(account_number).trim();
  if (requestedBroker.length > 120 || accountNumber.length < 3 || accountNumber.length > 120) {
    return NextResponse.json({error:'Invalid broker or account number'}, {status:400});
  }
  const {data:brokerSettings,error:brokerError}=await supabaseAdmin
    .from('site_settings')
    .select('value')
    .eq('key','ib_brokers')
    .maybeSingle();
  if(brokerError)return NextResponse.json({error:'Broker catalog could not be verified'},{status:500});
  const activeBrokers=Array.isArray(brokerSettings?.value)
    ? brokerSettings.value.filter((broker:any)=>broker?.is_active===true)
    : [];
  const selectedBroker=activeBrokers.find((broker:any)=>
    String(broker?.name??'').toLowerCase()===requestedBroker.toLowerCase()
  );
  if(activeBrokers.length&&!selectedBroker){
    return NextResponse.json({error:'Select an active broker from the approved broker list'},{status:400});
  }
  const canonicalBrokerName=selectedBroker?String(selectedBroker.name):requestedBroker;
  const { data:existing } = await supabaseAdmin.from('ib_registrations').select('id,status').eq('user_id',s.userId).neq('status','rejected').maybeSingle();
  if (existing) return NextResponse.json({ error:`You already have a ${existing.status} IB application.`, existing },{ status:409 });
  const { data, error } = await supabaseAdmin.from('ib_registrations').insert({ user_id:s.userId, broker_name:canonicalBrokerName, account_number:accountNumber, status:'pending', submitted_at:new Date().toISOString() }).select('*').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  await supabaseAdmin.from('profiles').update({ ib_status:'pending' }).eq('id',s.userId);
  return NextResponse.json(data,{ status:201 });
}
