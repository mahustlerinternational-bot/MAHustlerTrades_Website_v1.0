import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

const baseUrl = process.env.JOURNAL_SMOKE_BASE_URL ?? 'http://127.0.0.1:3010';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(supabaseUrl && anonKey && serviceKey, 'Supabase environment variables are required');

const admin = createClient(supabaseUrl, serviceKey, {auth: {persistSession: false, autoRefreshToken: false}});
const browser = createClient(supabaseUrl, anonKey, {auth: {persistSession: false, autoRefreshToken: false}});
const email = `journal-smoke-${Date.now()}@example.test`;
const password = `Smoke-${crypto.randomUUID()}-Aa1!`;
let userId = null;
let token = null;
const tradeIds = [];

async function api(path, init = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, {...init, headers});
  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return {response, body};
}

const firstTrade = {
  symbol: 'XAUUSD',
  direction: 'buy',
  trade_status: 'closed',
  opened_at: '2026-07-23T08:00:00.000Z',
  closed_at: '2026-07-23T09:00:00.000Z',
  entry_price: 4100,
  exit_price: 4110,
  stop_loss: 4095,
  take_profit: 4110,
  lot_size: 0.1,
  net_pnl: 100,
  fees: 2,
  risk_amount: 50,
  result_r: null,
  strategy: 'Smoke Strategy',
  setup: 'Smoke Setup',
  timeframe: 'M15',
  session: 'London',
  market_condition: 'Trending Bull',
  followed_plan: true,
  mistakes: [],
  tags: ['smoke'],
  notes: 'Temporary production smoke test',
  rating: 5,
  external_ref: `smoke-${Date.now()}`,
};

try {
  const {data: created, error: createError} = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {full_name: 'Journal Smoke Test'},
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

  const freeAccess = await api('/api/me/journal/trades');
  assert.equal(freeAccess.response.status, 403);
  assert.match(freeAccess.body.error, /Elite access/i);

  const {error: activateError} = await admin
    .from('profiles')
    .update({ib_status: 'active'})
    .eq('id', userId);
  assert.ifError(activateError);

  const empty = await api('/api/me/journal/trades');
  assert.equal(empty.response.status, 200);
  assert.deepEqual(empty.body.trades, []);

  const createdTrade = await api('/api/me/journal/trades', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(firstTrade),
  });
  assert.equal(createdTrade.response.status, 201, JSON.stringify(createdTrade.body));
  assert.equal(Number(createdTrade.body.result_r), 2);
  tradeIds.push(createdTrade.body.id);

  const updatedTrade = await api(`/api/me/journal/trades/${createdTrade.body.id}`, {
    method: 'PATCH',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({...firstTrade, net_pnl: 120, result_r: null}),
  });
  assert.equal(updatedTrade.response.status, 200, JSON.stringify(updatedTrade.body));
  assert.equal(Number(updatedTrade.body.result_r), 2.4);

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );
  const prepared = await api('/api/me/journal/screenshots', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      action: 'prepare',
      trade_id: createdTrade.body.id,
      file_name: 'smoke-chart.png',
      file_size: png.length,
      mime_type: 'image/png',
    }),
  });
  assert.equal(prepared.response.status, 200, JSON.stringify(prepared.body));
  const {error: uploadError} = await browser.storage
    .from(prepared.body.bucket)
    .uploadToSignedUrl(prepared.body.path, prepared.body.token, png, {contentType: 'image/png'});
  assert.ifError(uploadError);

  const confirmed = await api('/api/me/journal/screenshots', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      action: 'confirm',
      trade_id: createdTrade.body.id,
      path: prepared.body.path,
      file_name: prepared.body.file_name,
      file_size: prepared.body.file_size,
      mime_type: prepared.body.mime_type,
    }),
  });
  assert.equal(confirmed.response.status, 201, JSON.stringify(confirmed.body));

  const withScreenshot = await api('/api/me/journal/trades');
  assert.equal(withScreenshot.response.status, 200);
  assert.equal(withScreenshot.body.trades[0].screenshots.length, 1);
  assert.equal((await fetch(withScreenshot.body.trades[0].screenshots[0].url)).status, 200);

  const exported = await api('/api/me/journal/export');
  assert.equal(exported.response.status, 200);
  assert.match(exported.body, /external_ref,opened_at,closed_at,symbol/);
  assert.match(exported.body, /Smoke Strategy/);

  const importCsv = [
    'external_ref,opened_at,closed_at,symbol,direction,trade_status,entry_price,exit_price,lot_size,net_pnl,fees,risk_amount,strategy,setup,followed_plan,mistakes,tags',
    `smoke-import-${Date.now()},2026-07-24T08:00:00.000Z,2026-07-24T09:00:00.000Z,XAUUSD,sell,closed,4120,4110,0.1,80,1,40,CSV Strategy,CSV Setup,true,,imported`,
  ].join('\n');
  const imported = await api('/api/me/journal/import', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({csv: importCsv}),
  });
  assert.equal(imported.response.status, 201, JSON.stringify(imported.body));
  assert.equal(imported.body.imported, 1);

  const finalList = await api('/api/me/journal/trades');
  assert.equal(finalList.response.status, 200);
  assert.equal(finalList.body.trades.length, 2);
  tradeIds.push(finalList.body.trades.find(trade => trade.source === 'csv').id);

  for (const tradeId of tradeIds) {
    const deleted = await api(`/api/me/journal/trades/${tradeId}`, {method: 'DELETE'});
    assert.equal(deleted.response.status, 200, JSON.stringify(deleted.body));
  }
  const cleaned = await api('/api/me/journal/trades');
  assert.equal(cleaned.body.trades.length, 0);

  console.log('Trading Journal free-member access gate, Elite CRUD, screenshot and CSV production tests passed.');
} finally {
  if (userId) {
    await admin.from('trading_journal_trades').delete().eq('user_id', userId);
    const {data: objects} = await admin.storage.from('journal-screenshots').list(userId, {limit: 100});
    if (objects?.length) {
      const paths = [];
      for (const folder of objects) {
        const {data: files} = await admin.storage.from('journal-screenshots').list(`${userId}/${folder.name}`, {limit: 100});
        paths.push(...(files ?? []).map(file => `${userId}/${folder.name}/${file.name}`));
      }
      if (paths.length) await admin.storage.from('journal-screenshots').remove(paths);
    }
    await admin.auth.admin.deleteUser(userId);
  }
}
