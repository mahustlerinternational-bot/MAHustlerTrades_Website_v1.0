// src/app/api/payments/ziina/route.ts — Ziina Payment Gateway
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuthSession } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ZIINA_API   = 'https://api.ziina.com/api/payment_intent';
const ZIINA_TOKEN = process.env.ZIINA_API_TOKEN ?? '';
const USD_TO_AED  = 3.6725;

async function logIntent(userId: string, intentId: string, type: string, refId: string, amountUsd: number, checkoutUrl: string) {
  try {
    await (supabaseAdmin.from as any)('payment_intents').insert({
      user_id: userId, ziina_intent_id: intentId, type,
      reference_id: refId, amount_usd: amountUsd,
      amount_aed: amountUsd * USD_TO_AED, status: 'pending',
      checkout_url: checkoutUrl,
    });
  } catch { /* payment_intents table optional — run migration 003 to enable */ }
}

export async function POST(req: NextRequest) {
  const s = await requireAuthSession(req);
  if (!s?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type, id, amount, description } = await req.json();
  if (!type || !id || !amount) {
    return NextResponse.json({ error: 'type, id, amount required' }, { status: 400 });
  }

  // No token → stub response for development
  if (!ZIINA_TOKEN) {
    return NextResponse.json({
      requires_payment: true, gateway: 'ziina',
      amount_usd: amount, amount_aed: (amount * USD_TO_AED).toFixed(2),
      message: 'Ziina not configured. Add ZIINA_API_TOKEN to .env.local',
      checkout_url: null,
    }, { status: 202 });
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3010';
    const portalPath = type === 'course' ? 'courses' : 'packages';

    const res = await fetch(ZIINA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZIINA_TOKEN}`,
      },
      body: JSON.stringify({
        amount:        Math.round(amount * USD_TO_AED * 100),
        currency_code: 'AED',
        message:       description ?? `MAHustler Trades — ${type}`,
        success_url:   `${appUrl}/portal/${portalPath}?payment=success&ref=${id}`,
        cancel_url:    `${appUrl}/portal/${portalPath}?payment=cancelled`,
        test:          process.env.NODE_ENV !== 'production',
      }),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.message ?? 'Ziina error' }, { status: 500 });

    await logIntent(s.userId, data.id, type, id, amount, data.redirect_url);

    return NextResponse.json({
      checkout_url: data.redirect_url,
      intent_id:    data.id,
      amount_aed:   (amount * USD_TO_AED).toFixed(2),
      currency:     'AED',
    });
  } catch (err) {
    return NextResponse.json({ error: 'Payment gateway error: ' + String(err) }, { status: 500 });
  }
}
