import {NextRequest,NextResponse} from 'next/server';
import {requireAuthSession,supabaseAdmin} from '@/lib/supabase/server';
import {generateAssistantAnswer} from '@/lib/support/assistant';
import {addSignedAttachments,removeSupportAttachment,storeSupportAttachment,type StoredSupportAttachment} from '@/lib/support/attachments';

export const dynamic='force-dynamic';

async function conversation(userId:string){
  const existing=await supabaseAdmin.from('support_conversations').select('*').eq('user_id',userId).neq('status','closed').order('last_message_at',{ascending:false}).limit(1).maybeSingle();
  if(existing.error)throw new Error(existing.error.message);if(existing.data)return existing.data;
  const created=await supabaseAdmin.from('support_conversations').insert({user_id:userId}).select('*').single();if(created.error)throw new Error(created.error.message);return created.data;
}

export async function GET(req:NextRequest){
  const session=await requireAuthSession(req);if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
  const current=await conversation(session.userId);const [messages,ticket,setting]=await Promise.all([
    supabaseAdmin.from('support_messages').select('id,role,content,metadata,created_at').eq('conversation_id',current.id).order('created_at',{ascending:true}).limit(100),
    supabaseAdmin.from('support_tickets').select('id,status,priority,subject,created_at').eq('conversation_id',current.id).in('status',['open','in_progress']).maybeSingle(),
    supabaseAdmin.from('site_settings').select('value').eq('key','assistant').maybeSingle(),
  ]);
  if(messages.error)return NextResponse.json({error:messages.error.message},{status:500});
  const cfg=setting.data?.value as Record<string,unknown>|null;
  const signedMessages=await addSignedAttachments(messages.data??[]);
  return NextResponse.json({conversation_id:current.id,messages:signedMessages,ticket:ticket.data??null,assistant:{name:String(cfg?.name??'MAHustler Assistant'),welcome:String(cfg?.welcome??'Hi! How can I help with your membership today?'),enabled:cfg?.enabled!==false,provider:String(cfg?.provider??'built_in')}});
}

export async function POST(req:NextRequest){
  const session=await requireAuthSession(req);if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
  let message='';let file:File|null=null;
  if(req.headers.get('content-type')?.includes('multipart/form-data')){
    const form=await req.formData();message=String(form.get('message')??'').trim();const candidate=form.get('file');if(candidate instanceof File&&candidate.size>0)file=candidate;
  }else{
    const body=await req.json();message=String(body.message??'').trim();
  }
  if((!message&&!file)||message.length>2000)return NextResponse.json({error:'Enter a message or attach a file. Messages can be up to 2000 characters.'},{status:400});
  const assistantSetting=await supabaseAdmin.from('site_settings').select('value').eq('key','assistant').maybeSingle();const assistantCfg=(assistantSetting.data?.value??{}) as Record<string,unknown>;
  if(assistantCfg.enabled===false)return NextResponse.json({error:'The member assistant is currently unavailable'},{status:503});
  const recent=await supabaseAdmin.from('support_messages').select('*',{count:'exact',head:true}).eq('user_id',session.userId).eq('role','user').gte('created_at',new Date(Date.now()-60_000).toISOString());
  if((recent.count??0)>=12)return NextResponse.json({error:'Please wait a moment before sending more messages'},{status:429});
  const current=await conversation(session.userId);let attachment:StoredSupportAttachment|null=null;
  try{if(file)attachment=await storeSupportAttachment(session.userId,file);}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Upload failed'},{status:400});}
  const content=message||`Attached a file: ${attachment?.name??'attachment'}`;
  const inserted=await supabaseAdmin.from('support_messages').insert({conversation_id:current.id,user_id:session.userId,role:'user',content,metadata:attachment?{attachment}:{}}).select('id,role,content,metadata,created_at').single();
  if(inserted.error){if(attachment)await removeSupportAttachment(attachment);return NextResponse.json({error:inserted.error.message},{status:500});}
  const [history,profile,ib,accounts,invites]=await Promise.all([
    supabaseAdmin.from('support_messages').select('role,content').eq('conversation_id',current.id).order('created_at',{ascending:true}).limit(20),
    supabaseAdmin.from('profiles').select('full_name,role,ib_status').eq('id',session.userId).single(),
    supabaseAdmin.from('ib_registrations').select('status').eq('user_id',session.userId).order('submitted_at',{ascending:false}).limit(1).maybeSingle(),
    supabaseAdmin.from('member_community_accounts').select('platform').eq('user_id',session.userId),
    supabaseAdmin.from('community_invites').select('platform').eq('user_id',session.userId).eq('status','active'),
  ]);
  if(profile.error)return NextResponse.json({error:profile.error.message},{status:500});
  const platforms=new Set((accounts.data??[]).map(x=>x.platform)),invitePlatforms=new Set((invites.data??[]).map(x=>x.platform));
  const context={name:profile.data.full_name??'',role:profile.data.role,ibStatus:profile.data.ib_status,ibApplication:ib.data?.status??'none',telegramLinked:platforms.has('telegram'),discordLinked:platforms.has('discord'),hasTelegramInvite:invitePlatforms.has('telegram'),hasDiscordInvite:invitePlatforms.has('discord')};
  const generated=message?await generateAssistantAnswer(message,history.data??[],context,{provider:String(assistantCfg.provider??'built_in'),instructions:String(assistantCfg.instructions??''),knowledgeBase:String(assistantCfg.knowledge_base??'')}):{text:`I received your file “${attachment?.name??'attachment'}”. It is stored securely and will be available to the administrator if you open a support ticket.`,provider:'built_in_local',response_id:undefined,error:undefined};
  const assistant=await supabaseAdmin.from('support_messages').insert({conversation_id:current.id,role:'assistant',content:generated.text,metadata:{provider:generated.provider,response_id:generated.response_id??null,error:generated.error??null}}).select('id,role,content,created_at').single();
  await supabaseAdmin.from('support_conversations').update({last_message_at:new Date().toISOString()}).eq('id',current.id);
  if(assistant.error)return NextResponse.json({error:assistant.error.message},{status:500});return NextResponse.json({user:inserted.data,assistant:assistant.data});
}
