import assert from 'node:assert/strict';

import {
  buildEliteAccessApprovalEmail,
  maskBrokerAccount,
} from '../src/lib/email/eliteAccessApproval';

assert.equal(maskBrokerAccount('123456789'), '•••• 6789');
assert.equal(maskBrokerAccount('  AB 12 34  '), '•••• 1234');

const email = buildEliteAccessApprovalEmail({
  to: 'member@example.com',
  memberName: 'Alex <Elite>',
  memberCode: 'MAHT_AB12CD34',
  brokerName: 'Example & Broker',
  accountNumber: '123456789',
  approvedAt: new Date('2026-07-27T12:00:00.000Z'),
  appUrl: 'https://mahustlertrades.vercel.app/',
});

assert.equal(email.subject, 'Your Elite Access Has Been Approved 🏆');
assert.match(email.html, /ELITE ACCESS APPROVED/);
assert.match(email.html, /Alex &lt;Elite&gt;/);
assert.doesNotMatch(email.html, /Alex <Elite>/);
assert.match(email.html, /Example &amp; Broker/);
assert.match(email.html, /•••• 6789/);
assert.doesNotMatch(email.html, /123456789/);
assert.match(email.html, /https:\/\/mahustlertrades\.vercel\.app\/portal\/dashboard/);
assert.match(email.html, /https:\/\/mahustlertrades\.vercel\.app\/portal\/ib/);
assert.match(email.text, /Elite Membership Active/);
assert.match(email.text, /MAHT_AB12CD34/);
assert.doesNotMatch(email.text, /123456789/);

console.log('Elite Access approval email template and account masking tests passed.');
