import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/server';

export type PublicCertificateVerification = {
  valid: true;
  certificate_number: string;
  member_name: string;
  course_title: string;
  issued_at: string;
};

function cleanVerificationCode(value: string) {
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9]{12,64}$/.test(code) ? code : null;
}

export function buildCertificateVerificationUrl(
  verificationCode: string,
  requestOrigin?: string,
) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  const configuredIsLocal =
    !configuredOrigin || /\/\/(?:localhost|127\.0\.0\.1)(?::|\/|$)/i.test(configuredOrigin);
  const safeRequestOrigin =
    requestOrigin && /^https?:\/\//i.test(requestOrigin)
      ? requestOrigin.replace(/\/+$/, '')
      : null;
  const origin =
    !configuredIsLocal && configuredOrigin
      ? configuredOrigin
      : safeRequestOrigin ?? configuredOrigin ?? 'http://localhost:3010';
  return `${origin}/certificate/verify/${encodeURIComponent(verificationCode)}`;
}

export async function getPublicCertificateVerification(
  verificationCode: string,
): Promise<PublicCertificateVerification | null> {
  const code = cleanVerificationCode(verificationCode);
  if (!code) return null;

  const result = await supabaseAdmin
    .from('course_certificates')
    .select('certificate_number,issued_at,metadata')
    .eq('verification_code', code)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data) return null;

  const metadata =
    result.data.metadata && typeof result.data.metadata === 'object'
      ? (result.data.metadata as Record<string, unknown>)
      : {};
  return {
    valid: true,
    certificate_number: result.data.certificate_number,
    member_name: String(metadata.member_name ?? 'MAHustler Member'),
    course_title: String(metadata.course_title ?? 'MAHustler Trades Course'),
    issued_at: result.data.issued_at,
  };
}
