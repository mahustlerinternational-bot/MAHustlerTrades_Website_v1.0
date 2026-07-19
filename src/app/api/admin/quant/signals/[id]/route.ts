import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/supabase/server';
import { closeSignal } from '@/lib/quant/signalService';
export const dynamic = 'force-dynamic';
export async function PATCH(req: NextRequest,{ params }:{ params:Promise<{ id:string }> }) {
  const { id } = await params;
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const b = await req.json();
  try{return NextResponse.json(await closeSignal({id,status:b.status,closed_price:b.closed_price==null?null:Number(b.closed_price)}));}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:400});}
}
