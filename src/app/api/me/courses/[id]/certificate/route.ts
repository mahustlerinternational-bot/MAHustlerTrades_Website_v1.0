import {NextRequest, NextResponse} from 'next/server';

import {ensureCourseCertificate, generateCertificatePdf} from '@/lib/lms/certificate';
import {hasCourseAccess} from '@/lib/lms/access';
import {requireAuthSession, supabaseAdmin} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const {id} = await params;
  if (!(await hasCourseAccess(session.userId, id))) {
    return NextResponse.json({error: 'An active course enrollment is required'}, {status: 403});
  }

  try {
    const certificate = await ensureCourseCertificate(session.userId, id);
    const download = new URL(req.url).searchParams.get('download') === '1';
    if (!download) {
      return NextResponse.json({
        certificate_number: certificate.certificate_number,
        verification_code: certificate.verification_code,
        issued_at: certificate.issued_at,
      });
    }

    const [pdf, course] = await Promise.all([
      generateCertificatePdf(certificate),
      supabaseAdmin.from('courses').select('title').eq('id', id).single(),
    ]);
    const safeTitle = String(course.data?.title ?? 'course-certificate')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeTitle || 'course'}-certificate.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Certificate is not available'},
      {status: 409},
    );
  }
}
