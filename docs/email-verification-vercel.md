# Email Verification — Supabase + Vercel

The application code enforces email verification for all new public registrations.
Complete these external settings before opening registration to real users.

## 1. Configure production email delivery

In Supabase Dashboard:

1. Open **Authentication → Email → SMTP Settings**.
2. Enable custom SMTP.
3. Enter credentials from Resend, Postmark, Amazon SES, SendGrid, Brevo, or another SMTP provider.
4. Use a verified sender such as `MAHustler Trades <no-reply@your-domain.com>`.
5. Configure SPF, DKIM, and DMARC at the email provider.
6. Disable click tracking for authentication email links.

Supabase's built-in email service is for limited testing and is not suitable for public production registration.

## 2. Configure authentication URLs

In **Authentication → URL Configuration**:

- Set **Site URL** to the official Vercel production URL or custom domain.
- Add the exact production callback:
  `https://YOUR-DOMAIN/auth/confirm`
- Add required Vercel preview callbacks only while testing.

In Vercel, set:

```text
NEXT_PUBLIC_APP_URL=https://YOUR-DOMAIN
```

The browser signup flow uses the current deployment origin for the confirmation redirect.

## 3. Confirm the provider settings

In **Authentication → Providers → Email**:

- Enable email/password signup.
- Enable **Confirm Email**.

The application deliberately stops registration if Supabase returns an immediate session, because that means email confirmation is disabled.

## 4. Install the branded confirmation email

In **Authentication → Email Templates → Confirm signup**:

- Subject: copy `supabase/templates/confirmation-subject.txt`
- Body: copy all markup from `supabase/templates/confirmation.html`

The template uses Supabase's `{{ .ConfirmationURL }}` and `{{ .Token }}` variables.

## 5. Validate before launch

Test with Gmail, Outlook, and a mobile email client:

1. Register a new address.
2. Confirm that no portal session exists before verification.
3. Enter the six-digit code.
4. Register a second address and use the email button.
5. Confirm both routes create a profile and redirect to the portal.
6. Confirm resend enforces its cooldown.
7. Confirm invalid and expired links return to the login screen with a safe error.
