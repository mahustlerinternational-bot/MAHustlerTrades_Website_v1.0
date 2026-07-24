import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

const baseUrl = process.env.EMAIL_VERIFICATION_SMOKE_BASE_URL ?? 'http://127.0.0.1:3010';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(supabaseUrl && anonKey && serviceKey, 'Supabase environment variables are required');

const admin = createClient(supabaseUrl, serviceKey, {
  auth: {persistSession: false, autoRefreshToken: false},
});
const publicClient = () =>
  createClient(supabaseUrl, anonKey, {
    auth: {persistSession: false, autoRefreshToken: false},
  });
const createdUsers = [];
const stamp = Date.now();

async function generateSignupLink(kind) {
  const email = `email-verification-${kind}-${stamp}@example.invalid`;
  const password = `Verify-${crypto.randomUUID()}-Aa1!`;
  const result = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      data: {full_name: `Email Verification ${kind}`},
      redirectTo: `${baseUrl}/auth/confirm`,
    },
  });
  if (
    result.error ||
    !result.data.user ||
    !result.data.properties.hashed_token ||
    !result.data.properties.email_otp
  ) {
    throw new Error(result.error?.message ?? 'Could not generate signup verification');
  }
  createdUsers.push(result.data.user.id);
  return {
    id: result.data.user.id,
    email,
    password,
    tokenHash: result.data.properties.hashed_token,
    emailOtp: result.data.properties.email_otp,
  };
}

try {
  const otpUser = await generateSignupLink('otp');
  const blockedLogin = await publicClient().auth.signInWithPassword({
    email: otpUser.email,
    password: otpUser.password,
  });
  assert.ok(blockedLogin.error, 'unverified account must not receive a session');
  assert.match(blockedLogin.error.message, /email not confirmed/i);

  const unauthorizedCompletion = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({full_name: 'Unauthorized'}),
  });
  assert.equal(unauthorizedCompletion.status, 401);

  const otpClient = publicClient();
  const verified = await otpClient.auth.verifyOtp({
    email: otpUser.email,
    token: otpUser.emailOtp,
    type: 'email',
  });
  assert.ifError(verified.error);
  assert.ok(verified.data.session?.access_token);
  assert.ok(verified.data.user?.email_confirmed_at);

  const completed = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${verified.data.session.access_token}`,
    },
    body: JSON.stringify({full_name: 'Email Verification OTP'}),
  });
  const completedBody = await completed.json();
  assert.equal(completed.status, 200, JSON.stringify(completedBody));
  assert.equal(completedBody.profile.id, otpUser.id);
  assert.match(completedBody.profile.member_code, /^MAHT_[A-HJ-NP-Z2-9]{8}$/);

  const linkUser = await generateSignupLink('link');
  const callback = await fetch(
    `${baseUrl}/auth/confirm?token_hash=${encodeURIComponent(linkUser.tokenHash)}&type=signup&next=${encodeURIComponent('https://malicious.example')}`,
    {redirect: 'manual'},
  );
  assert.ok([302, 303, 307, 308].includes(callback.status));
  const callbackLocation = new URL(callback.headers.get('location'), baseUrl);
  assert.notEqual(callbackLocation.hostname, 'malicious.example');
  assert.ok(
    ['localhost', '127.0.0.1'].includes(callbackLocation.hostname),
    `callback must remain on the local application, received ${callbackLocation.origin}`,
  );
  assert.equal(callbackLocation.pathname, '/portal/dashboard');
  assert.equal(callbackLocation.searchParams.get('emailVerified'), '1');

  const linkAuth = await admin.auth.admin.getUserById(linkUser.id);
  assert.ifError(linkAuth.error);
  assert.ok(linkAuth.data.user.email_confirmed_at);
  const linkProfile = await admin.from('profiles').select('member_code').eq('id', linkUser.id).single();
  assert.ifError(linkProfile.error);
  assert.match(linkProfile.data.member_code, /^MAHT_[A-HJ-NP-Z2-9]{8}$/);

  console.log(
    'Email verification production smoke passed: unverified login denied, OTP verified, profile completed, callback verified, and external redirect blocked.',
  );
} finally {
  for (const userId of createdUsers.reverse()) {
    await admin.auth.admin.deleteUser(userId);
  }
}
