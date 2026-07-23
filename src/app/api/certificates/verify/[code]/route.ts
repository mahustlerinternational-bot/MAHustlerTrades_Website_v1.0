import {NextResponse} from 'next/server';

import {getPublicCertificateVerification} from '@/lib/lms/certificateVerification';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  {params}: {params: Promise<{code: string}>},
) {
  try {
    const {code} = await params;
    const certificate = await getPublicCertificateVerification(code);
    if (!certificate) {
      return NextResponse.json(
        {valid: false, error: 'Certificate record not found'},
        {status: 404, headers: {'Cache-Control': 'public, max-age=60'}},
      );
    }
    return NextResponse.json(certificate, {
      headers: {'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'},
    });
  } catch {
    return NextResponse.json(
      {valid: false, error: 'Certificate validation is temporarily unavailable'},
      {status: 503, headers: {'Cache-Control': 'no-store'}},
    );
  }
}
