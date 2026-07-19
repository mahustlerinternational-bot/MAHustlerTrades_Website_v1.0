import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function proxy(req:NextRequest){
  let response=NextResponse.next({request:req});
  const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{
    cookies:{
      getAll:()=>req.cookies.getAll(),
      setAll:(items)=>{
        items.forEach(({name,value})=>req.cookies.set(name,value));
        response=NextResponse.next({request:req});
        items.forEach(({name,value,options})=>response.cookies.set(name,value,options));
      },
    },
  });
  const {data:{user}}=await supabase.auth.getUser();
  const path=req.nextUrl.pathname;
  if(!user){
    const loginUrl=new URL('/portal',req.url);
    loginUrl.searchParams.set('tab','login');loginUrl.searchParams.set('returnTo',path);
    return NextResponse.redirect(loginUrl);
  }
  if(path.startsWith('/admin')){
    const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).single();
    if(profile?.role!=='admin')return NextResponse.redirect(new URL('/portal/dashboard',req.url));
  }
  return response;
}
