import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/server';

export async function ensureMemberProfile(userId: string, preferredName: string | null) {
  const fullName = preferredName?.trim().slice(0, 120) || null;
  const inserted = await supabaseAdmin
    .from('profiles')
    .upsert(
      {id: userId, full_name: fullName, role: 'member'},
      {onConflict: 'id', ignoreDuplicates: true},
    );
  if (inserted.error) throw new Error(inserted.error.message);

  const existing = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single();
  if (existing.error) throw new Error(existing.error.message);
  if (!existing.data.full_name && fullName) {
    const updated = await supabaseAdmin
      .from('profiles')
      .update({full_name: fullName})
      .eq('id', userId);
    if (updated.error) throw new Error(updated.error.message);
  }

  const result = await supabaseAdmin
    .from('profiles')
    .select('*,package:packages(name,slug,is_active)')
    .eq('id', userId)
    .single();
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
