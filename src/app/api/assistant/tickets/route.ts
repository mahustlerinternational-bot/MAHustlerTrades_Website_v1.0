import {NextRequest,NextResponse} from 'next/server';
import {requireAuthSession,supabaseAdmin} from '@/lib/supabase/server';

export const dynamic='force-dynamic';
export async function POST(req:NextRequest){
  const session=await requireAuthSession(req);if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
  const body=await req.json(),conversationId=String(body.conversation_id??''),subject=String(body.subject??'Member requested administrator assistance').trim().slice(0,180);
  const owned=await supabaseAdmin.from('support_conversations').select('id').eq('id',conversationId).eq('user_id',session.userId).maybeSingle();if(!owned.data)return NextResponse.json({error:'Conversation not found'},{status:404});
  const existing=await supabaseAdmin.from('support_tickets').select('*').eq('conversation_id',conversationId).in('status',['open','in_progress']).maybeSingle();if(existing.data)return NextResponse.json(existing.data);
  const ticket=await supabaseAdmin.from('support_tickets').insert({conversation_id:conversationId,user_id:session.userId,subject:subject||'Member support request'}).select('*').single();if(ticket.error)return NextResponse.json({error:ticket.error.message},{status:500});
  await Promise.all([supabaseAdmin.from('support_conversations').update({status:'escalated',last_message_at:new Date().toISOString()}).eq('id',conversationId),supabaseAdmin.from('support_messages').insert({conversation_id:conversationId,role:'system',content:'Your request was sent to an administrator. You can continue this conversation while waiting for a reply.'})]);
  return NextResponse.json(ticket.data,{status:201});
}
