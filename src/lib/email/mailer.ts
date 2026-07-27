import 'server-only';

import nodemailer from 'nodemailer';

export type TransactionalEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailDeliveryResult =
  | {status: 'sent'; message: string; messageId: string}
  | {status: 'skipped'; message: string}
  | {status: 'failed'; message: string};

function smtpConfiguration() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim() || user;
  const port = Number(process.env.SMTP_PORT || 465);
  const secureSetting = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureSetting === 'true'
      ? true
      : secureSetting === 'false'
        ? false
        : port === 465;

  if (!host || !user || !password || !fromEmail || !Number.isInteger(port)) {
    return null;
  }

  return {
    host,
    port,
    secure,
    user,
    password,
    fromEmail,
    fromName: process.env.SMTP_FROM_NAME?.trim() || 'MAHustler Trades',
    replyTo: process.env.SMTP_REPLY_TO?.trim() || undefined,
  };
}

function safeErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : 'Unknown SMTP error';
  const password = process.env.SMTP_PASSWORD;
  return (password ? raw.replaceAll(password, '[redacted]') : raw).slice(0, 240);
}

export async function sendTransactionalEmail(
  email: TransactionalEmail,
): Promise<EmailDeliveryResult> {
  const config = smtpConfiguration();
  if (!config) {
    return {
      status: 'skipped',
      message:
        'Approval email was not sent because the application SMTP environment variables are not configured.',
    };
  }

  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      tls: {
        minVersion: 'TLSv1.2',
      },
    });

    const result = await transport.sendMail({
      from: {
        name: config.fromName,
        address: config.fromEmail,
      },
      replyTo: config.replyTo,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    return {
      status: 'sent',
      message: 'Elite Access approval email sent.',
      messageId: result.messageId,
    };
  } catch (error) {
    const message = safeErrorMessage(error);
    console.error('[email] Elite Access approval delivery failed:', message);
    return {
      status: 'failed',
      message: `Elite Access was approved, but the notification email failed: ${message}`,
    };
  }
}
