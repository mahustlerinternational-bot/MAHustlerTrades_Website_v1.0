import {NextRequest, NextResponse} from 'next/server';

import {
  COURSE_MEDIA_BUCKET,
  createBrokerTutorialUpload,
  removeCourseMedia,
} from '@/lib/lms/media';
import {requireAdminSession} from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  try {
    const body = await req.json();
    return NextResponse.json(await createBrokerTutorialUpload(
      String(body.file_name ?? 'broker-tutorial'),
      String(body.content_type ?? ''),
      Number(body.size ?? 0),
    ));
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not prepare tutorial upload',
    }, {status: 400});
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const path = new URL(req.url).searchParams.get('path');
  if (!path || !path.startsWith('brokers/tutorials/')) {
    return NextResponse.json({error: 'Invalid broker tutorial path'}, {status: 400});
  }
  await removeCourseMedia(path);
  return NextResponse.json({success: true, bucket: COURSE_MEDIA_BUCKET});
}
