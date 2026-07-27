import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

const baseUrl = process.env.ELITE_TOOLS_SMOKE_BASE_URL ?? 'http://127.0.0.1:3010';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(supabaseUrl && anonKey && serviceKey, 'Supabase environment variables are required');

const admin = createClient(supabaseUrl, serviceKey, {auth: {persistSession: false, autoRefreshToken: false}});
const browser = createClient(supabaseUrl, anonKey, {auth: {persistSession: false, autoRefreshToken: false}});
const email = `elite-tools-smoke-${Date.now()}@example.test`;
const password = `Smoke-${crypto.randomUUID()}-Aa1!`;
let userId = null;
let token = null;

async function api(path, init = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, {...init, headers});
  const body = await response.json();
  return {response, body};
}

try {
  const {data: created, error: createError} = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {full_name: 'Elite Tools Smoke Test'},
  });
  assert.ifError(createError);
  userId = created.user.id;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const {data: profile} = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (profile) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  const {data: signedIn, error: signInError} = await browser.auth.signInWithPassword({email, password});
  assert.ifError(signInError);
  token = signedIn.session.access_token;

  const denied = await api('/api/me/market-tools');
  assert.equal(denied.response.status, 403);

  const {error: activateError} = await admin.from('profiles').update({ib_status: 'active'}).eq('id', userId);
  assert.ifError(activateError);

  const access = await api('/api/me/market-tools');
  assert.equal(access.response.status, 200, JSON.stringify(access.body));
  assert.equal(access.body.symbol, 'OANDA:XAUUSD');

  const initial = await api('/api/me/market-tools/workspace');
  assert.equal(initial.response.status, 200, JSON.stringify(initial.body));
  assert.equal(initial.body.preferences.activeTab, 'dashboard');

  const invalid = await api('/api/me/market-tools/workspace', {
    method: 'PUT',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      ...initial.body,
      preferences: {...initial.body.preferences, timezone: 'x'.repeat(81)},
    }),
  });
  assert.equal(invalid.response.status, 400);

  const workspace = {
    preferences: {
      ...initial.body.preferences,
      activeTab: 'chart',
      interval: '60',
      timezone: 'Asia/Dubai',
    },
    analysis: {
      ...initial.body.analysis,
      bias: 'bullish',
      direction: 'buy',
      thesis: 'Production smoke-test analysis',
      entry: 4100,
      stopLoss: 4090,
      takeProfit1: 4120,
      lotSize: .1,
      updatedAt: new Date().toISOString(),
    },
  };
  const saved = await api('/api/me/market-tools/workspace', {
    method: 'PUT',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(workspace),
  });
  assert.equal(saved.response.status, 200, JSON.stringify(saved.body));

  const restored = await api('/api/me/market-tools/workspace');
  assert.equal(restored.response.status, 200, JSON.stringify(restored.body));
  assert.equal(restored.body.preferences.activeTab, 'chart');
  assert.equal(restored.body.analysis.thesis, 'Production smoke-test analysis');

  const calendar = await api('/api/me/market-tools/calendar');
  assert.equal(calendar.response.status, 200, JSON.stringify(calendar.body));
  assert.ok(Array.isArray(calendar.body.events));
  assert.ok(calendar.body.events.length > 0, 'Weekly calendar must return at least one event');
  assert.match(calendar.body.source, /Forex Factory/i);

  console.log('Elite Tools access gate, cloud persistence, validation and calendar production smoke passed.');
} finally {
  if (userId) {
    await admin.from('elite_tool_workspaces').delete().eq('user_id', userId);
    await admin.auth.admin.deleteUser(userId);
  }
}
