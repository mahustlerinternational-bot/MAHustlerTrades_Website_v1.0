export type CertificateTextAlignment = 'left' | 'center' | 'right';

export type CertificatePlaceholderKey =
  | 'certificate_title'
  | 'member_name'
  | 'course_title'
  | 'issued_date'
  | 'certificate_id'
  | 'verification_qr';

export type CertificatePlaceholderLayout = {
  x: number;
  y: number;
  align: CertificateTextAlignment;
  font_size: number;
};

export type CertificateLayout = Record<
  CertificatePlaceholderKey,
  CertificatePlaceholderLayout
>;

export const CERTIFICATE_PLACEHOLDER_LABELS: Record<CertificatePlaceholderKey, string> = {
  certificate_title: 'Certificate title',
  member_name: 'Member name',
  course_title: 'Course title',
  issued_date: 'Issue date',
  certificate_id: 'Certificate ID',
  verification_qr: 'Validation QR code',
};

// X and Y are normalized to the certificate canvas. Y is measured from the top
// in the editor and converted to PDF coordinates by the certificate generator.
export const DEFAULT_CERTIFICATE_LAYOUT: CertificateLayout = {
  certificate_title: {x: 0.5, y: 0.32, align: 'center', font_size: 30},
  member_name: {x: 0.5, y: 0.51, align: 'center', font_size: 28},
  course_title: {x: 0.5, y: 0.67, align: 'center', font_size: 20},
  issued_date: {x: 0.5, y: 0.78, align: 'center', font_size: 10},
  certificate_id: {x: 0.5, y: 0.92, align: 'center', font_size: 9},
  verification_qr: {x: 0.1, y: 0.84, align: 'center', font_size: 58},
};

const PLACEHOLDER_KEYS = Object.keys(
  DEFAULT_CERTIFICATE_LAYOUT,
) as CertificatePlaceholderKey[];

function finiteNumber(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeCertificateLayout(value: unknown): CertificateLayout {
  const source =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    PLACEHOLDER_KEYS.map(key => {
      const defaults = DEFAULT_CERTIFICATE_LAYOUT[key];
      const candidate =
        source[key] && typeof source[key] === 'object'
          ? (source[key] as Record<string, unknown>)
          : {};
      const alignment = candidate.align;
      return [
        key,
        {
          x: clamp(finiteNumber(candidate.x, defaults.x), 0.03, 0.97),
          y: clamp(finiteNumber(candidate.y, defaults.y), 0.05, 0.95),
          align:
            alignment === 'left' || alignment === 'center' || alignment === 'right'
              ? alignment
              : defaults.align,
          font_size: Math.round(
            clamp(
              finiteNumber(candidate.font_size, defaults.font_size),
              key === 'verification_qr' ? 36 : 8,
              key === 'verification_qr' ? 96 : 48,
            ),
          ),
        },
      ];
    }),
  ) as CertificateLayout;
}
