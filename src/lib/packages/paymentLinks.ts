import { supabaseAdmin } from '@/lib/supabase/server';

export async function getMembershipPaymentLinks(): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'membership_payment_links').maybeSingle();
  return data?.value && typeof data.value === 'object' && !Array.isArray(data.value) ? data.value as Record<string,string> : {};
}

export async function saveMembershipPaymentLink(packageId: string, rawUrl: unknown, userId: string) {
  const url = String(rawUrl ?? '').trim();
  if (url) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && parsed.protocol === 'http:')) throw new Error('Payment link must use HTTPS');
  }
  const links = await getMembershipPaymentLinks();
  if (url) links[packageId] = url; else delete links[packageId];
  const { error } = await supabaseAdmin.from('site_settings').upsert({ key:'membership_payment_links', value:links, description:'Optional manual Ziina links by package id', updated_by:userId }, { onConflict:'key' });
  if (error) throw error;
}
