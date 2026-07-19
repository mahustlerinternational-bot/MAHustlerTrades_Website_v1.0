import {NextRequest,NextResponse} from 'next/server';
import {requireAdminSession} from '@/lib/supabase/server';
import {BUILT_IN_TOPIC_COUNT} from '@/lib/support/knowledge';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});return NextResponse.json({openai_configured:Boolean(process.env.OPENAI_API_KEY),model:process.env.OPENAI_ASSISTANT_MODEL||'gpt-5.4-mini',built_in_topics:BUILT_IN_TOPIC_COUNT});}
