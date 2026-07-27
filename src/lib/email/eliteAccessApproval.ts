import type {EmailDeliveryResult} from '@/lib/email/mailer';

export type EliteAccessApprovalEmailInput = {
  to: string;
  memberName: string | null;
  memberCode: string | null;
  brokerName: string;
  accountNumber: string;
  approvedAt: Date;
  appUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character]!,
  );
}

function publicAppUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Unsupported URL');
    return url.toString().replace(/\/+$/, '');
  } catch {
    return 'http://localhost:3010';
  }
}

export function maskBrokerAccount(value: string) {
  const compact = value.trim().replace(/\s+/g, '');
  const visible = compact.slice(-4);
  return visible ? `•••• ${visible}` : '••••';
}

export function buildEliteAccessApprovalEmail(input: EliteAccessApprovalEmailInput) {
  const appUrl = publicAppUrl(input.appUrl);
  const dashboardUrl = `${appUrl}/portal/dashboard`;
  const communityUrl = `${appUrl}/portal/ib`;
  const logoUrl = `${appUrl}/brand/mahustler-tab-logo.png`;
  const memberName = input.memberName?.trim() || 'Elite Member';
  const memberCode = input.memberCode?.trim() || 'Assigned to your profile';
  const accountReference = maskBrokerAccount(input.accountNumber);
  const approvedDate = new Intl.DateTimeFormat('en-AE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Dubai',
  }).format(input.approvedAt);

  const values = {
    memberName: escapeHtml(memberName),
    memberCode: escapeHtml(memberCode),
    brokerName: escapeHtml(input.brokerName),
    accountReference: escapeHtml(accountReference),
    approvedDate: escapeHtml(approvedDate),
    dashboardUrl: escapeHtml(dashboardUrl),
    communityUrl: escapeHtml(communityUrl),
    logoUrl: escapeHtml(logoUrl),
  };

  const subject = 'Your Elite Access Has Been Approved 🏆';
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#070707;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Your broker account has been verified. Welcome to MAHustler Trades Elite.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#070707;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#101010;border:1px solid #3d3317;">
            <tr>
              <td style="height:4px;background:#d4af37;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td align="center" style="padding:26px 24px 22px;background:#0b0b0b;border-bottom:1px solid #222;">
                <img src="${values.logoUrl}" width="76" height="76" alt="MAHustler Trades" style="display:block;width:76px;height:76px;object-fit:contain;border:0;">
                <div style="margin-top:12px;font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:bold;letter-spacing:4px;color:#ffd75a;">
                  MAHUSTLER
                </div>
                <div style="margin-top:4px;font-size:9px;letter-spacing:7px;color:#8c762f;">TRADES</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:33px 34px 18px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="padding:8px 15px;border:1px solid #28684f;background:#0b1b15;color:#54dda5;font-size:10px;font-weight:bold;letter-spacing:3px;">
                      &#10003;&nbsp; ELITE ACCESS APPROVED
                    </td>
                  </tr>
                </table>
                <h1 style="margin:19px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:29px;line-height:1.3;color:#ffffff;">
                  Congratulations, ${values.memberName}!
                </h1>
                <p style="margin:16px auto 0;max-width:475px;font-size:14px;line-height:1.8;color:#a0a0a0;">
                  Your Elite Access application has been reviewed and approved by the MAHustler Trades administration team.
                </p>
                <p style="margin:10px auto 0;max-width:475px;font-size:14px;line-height:1.8;color:#a0a0a0;">
                  Your account is now upgraded to an official <strong style="color:#ffd75a;">Elite Member</strong> account.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 34px 25px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#0b1511;border:1px solid #1d3d31;">
                  <tr>
                    <td colspan="2" style="padding:16px 18px 9px;font-family:Georgia,'Times New Roman',serif;font-size:10px;letter-spacing:3px;color:#54dda5;">
                      MEMBERSHIP DETAILS
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 18px;font-size:11px;color:#6f8e81;">Status</td>
                    <td align="right" style="padding:8px 18px;font-size:11px;font-weight:bold;color:#54dda5;">ELITE MEMBERSHIP ACTIVE</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 18px;font-size:11px;color:#6f8e81;">Member ID</td>
                    <td align="right" style="padding:8px 18px;font-family:'Courier New',monospace;font-size:11px;color:#e2e2e2;">${values.memberCode}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 18px;font-size:11px;color:#6f8e81;">Approved Broker</td>
                    <td align="right" style="padding:8px 18px;font-size:11px;color:#e2e2e2;">${values.brokerName}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 18px;font-size:11px;color:#6f8e81;">Trading Account</td>
                    <td align="right" style="padding:8px 18px;font-family:'Courier New',monospace;font-size:11px;color:#e2e2e2;">${values.accountReference}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 18px 17px;font-size:11px;color:#6f8e81;">Approval Date</td>
                    <td align="right" style="padding:8px 18px 17px;font-size:11px;color:#e2e2e2;">${values.approvedDate}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 34px 25px;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:10px;letter-spacing:3px;color:#d4af37;">YOUR ELITE BENEFITS ARE NOW UNLOCKED</div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:13px;">
                  <tr>
                    <td style="padding:9px 12px;border:1px solid #222;background:#0c0c0c;font-size:11px;line-height:1.55;color:#a0a0a0;">&#10003;&nbsp; Live trading signals, history, and performance</td>
                  </tr>
                  <tr><td height="6" style="font-size:0;line-height:0;">&nbsp;</td></tr>
                  <tr>
                    <td style="padding:9px 12px;border:1px solid #222;background:#0c0c0c;font-size:11px;line-height:1.55;color:#a0a0a0;">&#10003;&nbsp; Free enrollment in all eligible academy courses</td>
                  </tr>
                  <tr><td height="6" style="font-size:0;line-height:0;">&nbsp;</td></tr>
                  <tr>
                    <td style="padding:9px 12px;border:1px solid #222;background:#0c0c0c;font-size:11px;line-height:1.55;color:#a0a0a0;">&#10003;&nbsp; Elite Tools, My Trading Journal, and Elite Vault</td>
                  </tr>
                  <tr><td height="6" style="font-size:0;line-height:0;">&nbsp;</td></tr>
                  <tr>
                    <td style="padding:9px 12px;border:1px solid #222;background:#0c0c0c;font-size:11px;line-height:1.55;color:#a0a0a0;">&#10003;&nbsp; Elite Events and optional Telegram/Discord access</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:3px 34px 26px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="background:#d4af37;border:1px solid #f6d65f;">
                      <a href="${values.dashboardUrl}" style="display:inline-block;padding:15px 29px;font-family:Georgia,'Times New Roman',serif;font-size:12px;font-weight:bold;letter-spacing:2px;color:#050505;text-decoration:none;">
                        OPEN MY ELITE DASHBOARD
                      </a>
                    </td>
                  </tr>
                </table>
                <div style="margin-top:14px;">
                  <a href="${values.communityUrl}" style="font-size:11px;color:#d4af37;text-decoration:underline;">Manage Telegram &amp; Discord access</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 34px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#12100a;border:1px solid #3d3317;">
                  <tr>
                    <td style="padding:16px;font-size:11px;line-height:1.7;color:#81765a;">
                      <strong style="color:#d6bf79;">Community invitations</strong><br>
                      Your Telegram and Discord controls are available inside Elite Access. Joining is optional, and your private invitation links remain protected behind your authenticated account.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 34px 31px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#15100b;border:1px solid #4b2d20;">
                  <tr>
                    <td style="padding:16px;font-size:11px;line-height:1.7;color:#987b6d;">
                      <strong style="color:#d8aa91;">Security reminder</strong><br>
                      Never share your password, verification codes, or complete broker credentials. MAHustler Trades support will never ask for your password.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px;background:#090909;border-top:1px solid #222;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;font-weight:bold;letter-spacing:2px;color:#d4af37;">MAHUSTLER TRADES</div>
                <div style="margin-top:8px;font-size:9px;letter-spacing:2px;color:#555;">PRECISION &nbsp;&bull;&nbsp; DISCIPLINE &nbsp;&bull;&nbsp; EXECUTION</div>
                <div style="margin-top:14px;font-size:10px;line-height:1.6;color:#444;">This is an automated membership notification. Please do not reply.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `MAHUSTLER TRADES

ELITE ACCESS APPROVED

Congratulations, ${memberName}!

Your Elite Access application has been reviewed and approved. Your account is now upgraded to an official Elite Member account.

MEMBERSHIP DETAILS
Status: Elite Membership Active
Member ID: ${memberCode}
Approved Broker: ${input.brokerName}
Trading Account: ${accountReference}
Approval Date: ${approvedDate}

YOUR ELITE BENEFITS
- Live trading signals, history, and performance
- Free enrollment in all eligible academy courses
- Elite Tools, My Trading Journal, and Elite Vault
- Elite Events and optional Telegram/Discord access

Open your Elite dashboard:
${dashboardUrl}

Manage Telegram and Discord access:
${communityUrl}

Your Elite Membership remains active while your approved broker account continues meeting the programme eligibility requirements.

Never share your password, verification codes, or complete broker credentials.

MAHUSTLER TRADES
Precision • Discipline • Execution`;

  return {subject, html, text};
}

export async function sendEliteAccessApprovalEmail(
  input: EliteAccessApprovalEmailInput,
): Promise<EmailDeliveryResult> {
  const {sendTransactionalEmail} = await import('@/lib/email/mailer');
  return sendTransactionalEmail({
    to: input.to,
    ...buildEliteAccessApprovalEmail(input),
  });
}
