import {NextRequest,NextResponse} from 'next/server';
import {requireAdminSession,supabaseAdmin} from '@/lib/supabase/server';
import {addSignedAttachments,removeSupportAttachment,storeSupportAttachment,type StoredSupportAttachment} from '@/lib/support/attachments';

export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  const conversationId=new URL(req.url).searchParams.get('conversation_id');
  if(conversationId){
    const [conversation,messages,tickets]=await Promise.all([
      supabaseAdmin.from('support_conversations').select('*,profile:profiles!support_conversations_user_id_fkey(full_name)').eq('id',conversationId).single(),
      supabaseAdmin.from('support_messages').select('id,role,content,metadata,created_at').eq('conversation_id',conversationId).order('created_at'),
      supabaseAdmin.from('support_tickets').select('*').eq('conversation_id',conversationId).order('created_at',{ascending:false}),
    ]);if(conversation.error||messages.error||tickets.error)return NextResponse.json({error:(conversation.error??messages.error??tickets.error)?.message},{status:500});return NextResponse.json({conversation:conversation.data,messages:await addSignedAttachments(messages.data??[]),tickets:tickets.data});
  }
  const {data,error}=await supabaseAdmin.from('support_conversations').select('*,profile:profiles!support_conversations_user_id_fkey(full_name),tickets:support_tickets(id,status,priority,subject)').order('last_message_at',{ascending:false}).limit(100);
  if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json(data??[]);
}

export async function POST(req:NextRequest){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  let conversationId='',content='';let file:File|null=null;
  if(req.headers.get('content-type')?.includes('multipart/form-data')){const form=await req.formData();conversationId=String(form.get('conversation_id')??'');content=String(form.get('content')??'').trim();const candidate=form.get('file');if(candidate instanceof File&&candidate.size>0)file=candidate;}
  else{const body=await req.json();conversationId=String(body.conversation_id??'');content=String(body.content??'').trim();}
  if(!conversationId||(!content&&!file)||content.length>4000)return NextResponse.json({error:'Enter a reply or attach a file. Replies can be up to 4000 characters.'},{status:400});
  const owned=await supabaseAdmin.from('support_conversations').select('id').eq('id',conversationId).maybeSingle();if(!owned.data)return NextResponse.json({error:'Conversation not found'},{status:404});
  let attachment:StoredSupportAttachment|null=null;try{if(file)attachment=await storeSupportAttachment(session.userId,file);}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Upload failed'},{status:400});}
  const messageContent=content||`Attached a file: ${attachment?.name??'attachment'}`;
  const inserted=await supabaseAdmin.from('support_messages').insert({conversation_id:conversationId,user_id:session.userId,role:'admin',content:messageContent,metadata:attachment?{attachment}:{}}).select('*').single();if(inserted.error){if(attachment)await removeSupportAttachment(attachment);return NextResponse.json({error:inserted.error.message},{status:500});}
  await supabaseAdmin.from('support_conversations').update({status:'escalated',last_message_at:new Date().toISOString()}).eq('id',conversationId);return NextResponse.json(inserted.data,{status:201});
}

export async function PATCH(req:NextRequest){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  const body=await req.json(),ticketId=String(body.ticket_id??''),status=String(body.status??'');if(!ticketId||!['open','in_progress','resolved','closed'].includes(status))return NextResponse.json({error:'Invalid ticket update'},{status:400});
  const result=await supabaseAdmin.from('support_tickets').update({status,assigned_to:status==='in_progress'?session.userId:undefined}).eq('id',ticketId).select('*').single();if(result.error)return NextResponse.json({error:result.error.message},{status:500});
  if(['resolved','closed'].includes(status))await supabaseAdmin.from('support_conversations').update({status:status==='closed'?'closed':'open'}).eq('id',result.data.conversation_id);return NextResponse.json(result.data);
}
