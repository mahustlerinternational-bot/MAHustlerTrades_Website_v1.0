import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items) => {
          try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* Server Components cannot always write refreshed cookies. Proxy handles refresh. */ }
        },
      },
    }
  );
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession:false, autoRefreshToken:false } }
);

function readAuthCookieRaw(req?: NextRequest): string | null {
  const requestCookies = req?.cookies;
  if (!requestCookies) return null;
  const projectRef = (() => {
    try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname.split('.')[0]; }
    catch { return ''; }
  })();
  const expectedBase = `sb-${projectRef}-auth-token`;
  const getCookie = (name:string) => requestCookies.get(name)?.value;
  const direct = getCookie(expectedBase);
  if (direct) return direct;
  let combined='';
  for(let index=0;;index++){const chunk=getCookie(`${expectedBase}.${index}`);if(!chunk)break;combined+=chunk;}
  if(combined)return combined;
  const bases=new Set(requestCookies.getAll().map(cookie=>cookie.name.match(/^(sb-.+-auth-token)(?:\.\d+)?$/)?.[1]).filter((name):name is string=>Boolean(name)));
  for(const base of bases){
    const value=getCookie(base);if(value)return value;
    let chunks='';for(let index=0;;index++){const chunk=getCookie(`${base}.${index}`);if(!chunk)break;chunks+=chunk;}if(chunks)return chunks;
  }
  return null;
}

function extractAccessToken(raw:string):string|null{
  try{
    let decoded=decodeURIComponent(raw);
    if(decoded.startsWith('base64-'))decoded=Buffer.from(decoded.slice(7),'base64url').toString('utf8');
    const parsed=JSON.parse(decoded);
    if(Array.isArray(parsed))return parsed[0]??null;
    return parsed?.access_token??null;
  }catch{return null;}
}

export async function getSessionFromRequest(req?:NextRequest):Promise<{userId:string|null;role:string|null;error:string|null}>{
  try{
    const header=req?.headers.get('authorization')??'';
    const token=header.startsWith('Bearer ')?header.slice(7):extractAccessToken(readAuthCookieRaw(req)??'');
    if(!token)return {userId:null,role:null,error:'No session token found'};
    const {data:{user},error}=await supabaseAdmin.auth.getUser(token);
    if(error||!user)return {userId:null,role:null,error:error?.message??'Invalid or expired token'};
    const {data:profile,error:profileError}=await supabaseAdmin.from('profiles').select('role').eq('id',user.id).single();
    if(profileError)return {userId:null,role:null,error:profileError.message};
    return {userId:user.id,role:profile?.role??'member',error:null};
  }catch(error){return {userId:null,role:null,error:error instanceof Error?error.message:String(error)};}
}

export async function requireAdminSession(req?:NextRequest):Promise<{userId:string;role:string}|null>{
  const session=await getSessionFromRequest(req);
  if(!session.userId||session.role!=='admin'){console.error('[requireAdminSession] denied:',session.error??`role=${session.role}`);return null;}
  return {userId:session.userId,role:session.role};
}

export async function requireAuthSession(req?:NextRequest):Promise<{userId:string;role:string}|null>{
  const session=await getSessionFromRequest(req);
  if(!session.userId){console.error('[requireAuthSession] denied:',session.error);return null;}
  return {userId:session.userId,role:session.role??'member'};
}
