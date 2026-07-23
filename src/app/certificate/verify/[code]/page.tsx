import type {Metadata} from 'next';
import Link from 'next/link';
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react';

import {getPublicCertificateVerification} from '@/lib/lms/certificateVerification';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Certificate Validation — MAHustler Trades',
  description: 'Validate an electronic MAHustler Trades course certificate.',
};

export default async function CertificateVerificationPage({
  params,
}: {
  params: Promise<{code: string}>;
}) {
  const {code} = await params;
  let certificate = null;
  try {
    certificate = await getPublicCertificateVerification(code);
  } catch {
    certificate = null;
  }

  const issuedDate = certificate
    ? new Intl.DateTimeFormat('en-AE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Dubai',
      }).format(new Date(certificate.issued_at))
    : null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.brand}>
          MAHUSTLER
          <span className={styles.brandSub}>TRADES</span>
        </Link>

        <section className={styles.card}>
          <div className={styles.accent} />
          <div className={styles.content}>
            <div className={styles.status}>
              <div
                className={`${styles.statusIcon} ${
                  certificate ? '' : styles.statusIconInvalid
                }`}
              >
                {certificate ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
              </div>
              <div>
                <p className={styles.eyebrow}>CERTIFICATE VALIDATION</p>
                <h1 className={styles.title}>
                  {certificate ? 'Verified & Authentic' : 'Certificate Not Found'}
                </h1>
                <p className={styles.description}>
                  {certificate
                    ? 'This electronic certificate matches an official course-completion record issued by MAHustler Trades.'
                    : 'This verification code does not match an active MAHustler Trades certificate record. Check the complete link or contact support.'}
                </p>
              </div>
            </div>

            {certificate && (
              <>
                <div className={styles.details}>
                  <div className={styles.detail}>
                    <p className={styles.detailLabel}>
                      <UserRound size={13} /> Certificate Holder
                    </p>
                    <p className={styles.detailValue}>{certificate.member_name}</p>
                  </div>
                  <div className={styles.detail}>
                    <p className={styles.detailLabel}>
                      <BookOpen size={13} /> Completed Course
                    </p>
                    <p className={styles.detailValue}>{certificate.course_title}</p>
                  </div>
                  <div className={styles.detail}>
                    <p className={styles.detailLabel}>
                      <CalendarDays size={13} /> Issue Date
                    </p>
                    <p className={styles.detailValue}>{issuedDate}</p>
                  </div>
                  <div className={styles.detail}>
                    <p className={styles.detailLabel}>
                      <Award size={13} /> Certificate ID
                    </p>
                    <p className={`${styles.detailValue} ${styles.certificateId}`}>
                      {certificate.certificate_number}
                    </p>
                  </div>
                </div>

                <div className={styles.seal}>
                  <ShieldCheck size={25} />
                  <p>
                    Validation is performed directly against the official MAHustler Trades
                    certificate registry. Personal account and assessment data remain private.
                  </p>
                </div>
              </>
            )}

            <div className={styles.actions}>
              <Link href="/" className={styles.button}>
                RETURN TO MAHUSTLER TRADES
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
