import 'server-only';
import {localKnowledgeAnswer,type SupportContext} from './knowledge';

export async function generateAssistantAnswer(message:string,history:Array<{role:string;content:string}>,context:SupportContext,options:{provider:string;instructions:string;knowledgeBase:string}){
  const earlierUser=[...history.slice(0,-1)].reverse().find(item=>item.role==='user')?.content??'';
  const refersBack=/\b(it|that|this|those|them|same|another|different|change|replace)\b/i.test(message)&&message.trim().split(/\s+/).length<18;
  const localQuestion=refersBack&&earlierUser?`${earlierUser} Follow-up: ${message}`:message;
  const local=()=>localKnowledgeAnswer(localQuestion,context,options.knowledgeBase);
  if(options.provider!=='openai')return {text:local(),provider:'built_in_local'};
  const key=process.env.OPENAI_API_KEY;if(!key)return {text:local(),provider:'built_in_local',error:'OpenAI provider selected but OPENAI_API_KEY is not configured'};
  const system=`You are MAHustler Admin Assistant, a concise member-support agent. Answer only about this platform: account access, IB registration, brokers, membership, courses, events, signal-feed navigation, Telegram/Discord identity linking, and support escalation. Never provide personalized financial advice, trade recommendations, credentials, secrets, private invite URLs, or information about other members. Never claim an action happened unless the supplied context confirms it. If a request needs an administrator, tell the user to click Contact Admin. Member context: ${JSON.stringify(context)}. Admin guidance: ${options.instructions||'Be helpful, accurate, and concise.'} Curated knowledge: ${options.knowledgeBase||'Use the platform rules in the prompt.'}`;
  try{
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_ASSISTANT_MODEL||'gpt-5.4-mini',instructions:system,input:history.slice(-10).map(item=>({role:item.role==='assistant'?'assistant':'user',content:item.content})),max_output_tokens:500}),signal:AbortSignal.timeout(20000)});
    const body=await response.json();if(!response.ok)throw new Error(body?.error?.message??`OpenAI HTTP ${response.status}`);
    const output=body.output_text??body.output?.flatMap((item:{content?:Array<{type?:string;text?:string}>})=>item.content??[]).find((item:{type?:string})=>item.type==='output_text')?.text;
    if(!output)throw new Error('OpenAI returned no text');return {text:String(output).trim(),provider:'openai',response_id:body.id};
  }catch(error){console.error('[assistant OpenAI fallback]',error);return {text:local(),provider:'built_in_local',error:error instanceof Error?error.message:String(error)};}
}
