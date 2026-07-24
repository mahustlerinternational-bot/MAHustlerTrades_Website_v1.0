import 'server-only';

import {PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage} from 'pdf-lib';
import QRCode from 'qrcode';

import {downloadCertificateTemplate} from '@/lib/lms/media';
import {getMemberLmsState} from '@/lib/lms/memberState';
import {supabaseAdmin} from '@/lib/supabase/server';
import {buildCertificateVerificationUrl} from '@/lib/lms/certificateVerification';
import {
  normalizeCertificateLayout,
  type CertificatePlaceholderLayout,
} from '@/lib/lms/certificateLayout';

type CertificateRecord = {
  id: string;
  course_id: string;
  user_id: string;
  certificate_number: string;
  verification_code: string;
  template_path_snapshot: string | null;
  issued_at: string;
  metadata: Record<string, unknown>;
};

type CertificatePresentation = Pick<CertificateRecord, 'template_path_snapshot' | 'metadata'>;

function randomCode(length = 10) {
  return crypto.randomUUID().replace(/-/g, '').slice(0, length).toUpperCase();
}

function createCertificateNumber() {
  return `MAHT-CERT-${new Date().getUTCFullYear()}-${randomCode(8)}`;
}

async function getCurrentCertificatePresentation(
  userId: string,
  courseId: string,
): Promise<CertificatePresentation> {
  const [profile, course] = await Promise.all([
    supabaseAdmin.from('profiles').select('full_name,member_code').eq('id', userId).single(),
    supabaseAdmin
      .from('courses')
      .select('title,certificate_template_path,certificate_title,certificate_signatory_name,certificate_signatory_title,certificate_layout')
      .eq('id', courseId)
      .single(),
  ]);
  if (profile.error) throw new Error(profile.error.message);
  if (course.error) throw new Error(course.error.message);

  return {
    template_path_snapshot: course.data.certificate_template_path,
    metadata: {
      member_name: profile.data.full_name ?? 'MAHustler Member',
      member_code: profile.data.member_code ?? null,
      course_title: course.data.title,
      certificate_title: course.data.certificate_title,
      signatory_name: course.data.certificate_signatory_name,
      signatory_title: course.data.certificate_signatory_title,
      certificate_layout: normalizeCertificateLayout(course.data.certificate_layout),
    },
  };
}

async function refreshCertificatePresentation(
  record: CertificateRecord,
  userId: string,
  courseId: string,
) {
  const presentation = await getCurrentCertificatePresentation(userId, courseId);
  const refreshed = await supabaseAdmin
    .from('course_certificates')
    .update(presentation)
    .eq('id', record.id)
    .select('*')
    .single();
  if (refreshed.error) throw new Error(refreshed.error.message);
  return refreshed.data as CertificateRecord;
}

export async function ensureCourseCertificate(userId: string, courseId: string) {
  const existing = await supabaseAdmin
    .from('course_certificates')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) {
    return refreshCertificatePresentation(existing.data as CertificateRecord, userId, courseId);
  }

  const state = await getMemberLmsState(userId, courseId, false);
  if (!state.certificate.eligible) {
    throw new Error('Complete all lessons and pass the final assessment before claiming this certificate');
  }

  const presentation = await getCurrentCertificatePresentation(userId, courseId);

  const issuedAt = new Date().toISOString();
  const payload = {
    course_id: courseId,
    user_id: userId,
    certificate_number: createCertificateNumber(),
    verification_code: randomCode(16),
    ...presentation,
    issued_at: issuedAt,
  };
  const inserted = await supabaseAdmin
    .from('course_certificates')
    .upsert(payload, {onConflict: 'course_id,user_id', ignoreDuplicates: true})
    .select('*')
    .maybeSingle();
  if (inserted.error) throw new Error(inserted.error.message);
  if (inserted.data) return inserted.data as CertificateRecord;

  const raced = await supabaseAdmin
    .from('course_certificates')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single();
  if (raced.error) throw new Error(raced.error.message);
  return refreshCertificatePresentation(raced.data as CertificateRecord, userId, courseId);
}

function centeredText(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  preferredSize: number,
  color: ReturnType<typeof rgb>,
  maxWidth: number,
) {
  let size = preferredSize;
  while (size > 10 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (page.getWidth() - width) / 2,
    y,
    size,
    font,
    color,
  });
}

function positionedText(
  page: PDFPage,
  text: string,
  layout: CertificatePlaceholderLayout,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
  maxWidth: number,
) {
  let size = layout.font_size;
  while (size > 8 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  const textWidth = font.widthOfTextAtSize(text, size);
  const anchorX = page.getWidth() * layout.x;
  const x =
    layout.align === 'center'
      ? anchorX - textWidth / 2
      : layout.align === 'right'
        ? anchorX - textWidth
        : anchorX;

  page.drawText(text, {
    x: Math.min(page.getWidth() - textWidth - 12, Math.max(12, x)),
    y: page.getHeight() * (1 - layout.y),
    size,
    font,
    color,
  });
}

function certificateColor(value: string) {
  const red = Number.parseInt(value.slice(1, 3), 16) / 255;
  const green = Number.parseInt(value.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(value.slice(5, 7), 16) / 255;
  return rgb(red, green, blue);
}

async function createCertificateDocument(record: CertificateRecord, requestOrigin?: string) {
  const templatePath = record.template_path_snapshot;
  let document: PDFDocument;
  let page: PDFPage;
  let hasTemplate = false;

  if (templatePath) {
    try {
      const template = await downloadCertificateTemplate(templatePath);
      const bytes = new Uint8Array(await template.arrayBuffer());
      if (templatePath.toLowerCase().endsWith('.pdf')) {
        document = await PDFDocument.load(bytes);
        page = document.getPages()[0];
      } else {
        document = await PDFDocument.create();
        const image = templatePath.toLowerCase().endsWith('.png')
          ? await document.embedPng(bytes)
          : await document.embedJpg(bytes);
        const dimensions = image.scale(1);
        page = document.addPage([dimensions.width, dimensions.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: dimensions.width,
          height: dimensions.height,
        });
      }
      hasTemplate = true;
    } catch {
      document = await PDFDocument.create();
      page = document.addPage([842, 595]);
    }
  } else {
    document = await PDFDocument.create();
    page = document.addPage([842, 595]);
  }

  const {width, height} = page.getSize();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const gold = rgb(0.83, 0.69, 0.22);
  const ink = hasTemplate ? rgb(0.06, 0.06, 0.06) : rgb(0.95, 0.95, 0.95);
  const muted = hasTemplate ? rgb(0.28, 0.28, 0.28) : rgb(0.62, 0.62, 0.62);

  if (!hasTemplate) {
    page.drawRectangle({x: 0, y: 0, width, height, color: rgb(0.035, 0.035, 0.035)});
    page.drawRectangle({
      x: 22,
      y: 22,
      width: width - 44,
      height: height - 44,
      borderColor: gold,
      borderWidth: 2,
    });
    page.drawRectangle({
      x: 31,
      y: 31,
      width: width - 62,
      height: height - 62,
      borderColor: rgb(0.45, 0.33, 0.08),
      borderWidth: 0.8,
    });
  }

  const metadata = record.metadata ?? {};
  const memberName = String(metadata.member_name ?? 'MAHustler Member');
  const courseTitle = String(metadata.course_title ?? 'MAHustler Trades Course');
  const certificateTitle = String(metadata.certificate_title ?? 'Certificate of Completion');
  const issuedDate = new Intl.DateTimeFormat('en-AE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Dubai',
  }).format(new Date(record.issued_at));
  const layout = normalizeCertificateLayout(metadata.certificate_layout);

  positionedText(
    page,
    certificateTitle,
    layout.certificate_title,
    bold,
    certificateColor(layout.certificate_title.color),
    width * 0.82,
  );
  positionedText(
    page,
    memberName,
    layout.member_name,
    bold,
    certificateColor(layout.member_name.color),
    width * 0.82,
  );
  positionedText(
    page,
    courseTitle,
    layout.course_title,
    bold,
    certificateColor(layout.course_title.color),
    width * 0.82,
  );
  positionedText(
    page,
    `Issued ${issuedDate}`,
    layout.issued_date,
    regular,
    certificateColor(layout.issued_date.color),
    width * 0.82,
  );
  positionedText(
    page,
    `Certificate ID: ${record.certificate_number}`,
    layout.certificate_id,
    bold,
    certificateColor(layout.certificate_id.color),
    width * 0.72,
  );

  const verificationUrl = buildCertificateVerificationUrl(
    record.verification_code,
    requestOrigin,
  );
  const qrPng = await QRCode.toBuffer(verificationUrl, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
    color: {dark: '#050505', light: '#FFFFFF'},
  });
  const qrImage = await document.embedPng(qrPng);
  const qrLayout = layout.verification_qr;
  const qrSize = Math.min(width, height) * (qrLayout.font_size / 595);
  const qrX = Math.min(
    width - qrSize - 12,
    Math.max(12, width * qrLayout.x - qrSize / 2),
  );
  const qrY = Math.min(
    height - qrSize - 12,
    Math.max(22, height * (1 - qrLayout.y) - qrSize / 2),
  );
  page.drawRectangle({
    x: qrX - 2,
    y: qrY - 2,
    width: qrSize + 4,
    height: qrSize + 4,
    color: rgb(1, 1, 1),
  });
  page.drawImage(qrImage, {x: qrX, y: qrY, width: qrSize, height: qrSize});
  const qrCaption = 'SCAN TO VALIDATE';
  page.drawText(qrCaption, {
    x: qrX + (qrSize - bold.widthOfTextAtSize(qrCaption, 5.5)) / 2,
    y: Math.max(12, qrY - 9),
    size: 5.5,
    font: bold,
    color: muted,
  });

  const signatoryName = String(metadata.signatory_name ?? '').trim();
  if (signatoryName) {
    centeredText(page, signatoryName, height * 0.10, bold, 10, ink, width * 0.45);
    const signatoryTitle = String(metadata.signatory_title ?? '').trim();
    if (signatoryTitle) centeredText(page, signatoryTitle, height * 0.07, regular, 8, muted, width * 0.45);
  }

  document.setTitle(`${courseTitle} — ${memberName}`);
  document.setAuthor('MAHustler Trades Academy');
  document.setSubject(`Electronic certificate ${record.certificate_number}`);
  document.setCreationDate(new Date(record.issued_at));
  return document;
}

export async function generateCertificatePdf(record: CertificateRecord, requestOrigin?: string) {
  const document = await createCertificateDocument(record, requestOrigin);
  return document.save();
}
