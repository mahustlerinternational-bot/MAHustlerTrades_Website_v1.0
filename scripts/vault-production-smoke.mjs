import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import {createClient} from '@supabase/supabase-js';

nextEnv.loadEnvConfig(process.cwd());

const base = 'http://127.0.0.1:3010';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error('Supabase environment is incomplete');

const adminClient = createClient(url, serviceKey, {
  auth: {persistSession: false, autoRefreshToken: false},
});
const publicClient = createClient(url, anonKey, {
  auth: {persistSession: false, autoRefreshToken: false},
});

const stamp = Date.now();
const password = 'Codex-Vault-Smoke-8249!';
const users = [];
const folderIds = [];
const resourceIds = [];
let uploadedPath = null;

async function api(path, token, init = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${base}${path}`, {...init, headers, redirect: 'manual'});
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return {status: response.status, body, headers: response.headers};
}

async function createUser(kind, patch = {}) {
  const email = `codex-vault-${kind}-${stamp}@example.invalid`;
  const made = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {full_name: `Vault Smoke ${kind}`},
  });
  if (made.error || !made.data.user) throw new Error(made.error?.message ?? 'User creation failed');
  users.push(made.data.user.id);
  if (Object.keys(patch).length) {
    const updated = await adminClient.from('profiles').update(patch).eq('id', made.data.user.id);
    if (updated.error) throw new Error(updated.error.message);
  }
  const signed = await publicClient.auth.signInWithPassword({email, password});
  if (signed.error || !signed.data.session) throw new Error(signed.error?.message ?? 'Sign-in failed');
  return {id: made.data.user.id, token: signed.data.session.access_token};
}

try {
  const admin = await createUser('admin', {role: 'admin'});
  const elite = await createUser('elite', {ib_status: 'active', role: 'ib_member'});
  const free = await createUser('free');

  const forbiddenAdmin = await api('/api/admin/vault/folders', free.token);
  assert.equal(forbiddenAdmin.status, 403, 'members must not access Vault administration');

  const root = await api('/api/admin/vault/folders', admin.token, {
    method: 'POST',
    body: JSON.stringify({
      name: `Smoke Tools ${stamp}`,
      description: 'Disposable Elite Vault verification folder',
      icon: 'tools',
      is_published: true,
    }),
  });
  assert.equal(root.status, 201, JSON.stringify(root.body));
  folderIds.push(root.body.id);

  const child = await api('/api/admin/vault/folders', admin.token, {
    method: 'POST',
    body: JSON.stringify({
      parent_id: root.body.id,
      name: 'Installers',
      description: 'Nested folder verification',
      icon: 'archive',
      is_published: true,
    }),
  });
  assert.equal(child.status, 201, JSON.stringify(child.body));
  folderIds.push(child.body.id);

  const contents = new TextEncoder().encode(`Elite Vault signed download ${stamp}`);
  const prepared = await api('/api/admin/vault/upload', admin.token, {
    method: 'POST',
    body: JSON.stringify({
      file_name: 'vault-smoke-readme.txt',
      file_size: contents.length,
      content_type: 'text/plain',
    }),
  });
  assert.equal(prepared.status, 200, JSON.stringify(prepared.body));
  uploadedPath = prepared.body.path;
  const upload = await adminClient.storage
    .from(prepared.body.bucket)
    .uploadToSignedUrl(prepared.body.path, prepared.body.token, contents, {
      contentType: 'text/plain',
    });
  if (upload.error) throw upload.error;

  const fileResource = await api('/api/admin/vault/resources', admin.token, {
    method: 'POST',
    body: JSON.stringify({
      folder_id: child.body.id,
      resource_type: 'file',
      title: 'Vault Smoke Tool',
      description: 'Secure file delivery verification',
      storage_path: prepared.body.path,
      file_name: prepared.body.file_name,
      file_size: prepared.body.file_size,
      mime_type: prepared.body.mime_type,
      version: '1.0',
      tags: ['smoke', 'tool'],
      is_featured: true,
      is_published: true,
    }),
  });
  assert.equal(fileResource.status, 201, JSON.stringify(fileResource.body));
  resourceIds.push(fileResource.body.id);

  const linkResource = await api('/api/admin/vault/resources', admin.token, {
    method: 'POST',
    body: JSON.stringify({
      folder_id: root.body.id,
      resource_type: 'link',
      title: 'Vault Documentation',
      description: 'External resource redirect verification',
      external_url: 'https://example.com/vault-documentation',
      tags: ['documentation'],
      is_published: true,
    }),
  });
  assert.equal(linkResource.status, 201, JSON.stringify(linkResource.body));
  resourceIds.push(linkResource.body.id);

  const denied = await api('/api/me/vault', free.token);
  assert.equal(denied.status, 403, 'free members must not read Elite Vault content');

  const memberVault = await api('/api/me/vault', elite.token);
  assert.equal(memberVault.status, 200, JSON.stringify(memberVault.body));
  assert.equal(memberVault.body.folders.length, 2);
  assert.equal(memberVault.body.resources.length, 2);
  assert.equal(
    Object.prototype.hasOwnProperty.call(memberVault.body.resources[0], 'storage_path'),
    false,
    'member payload must not expose private storage paths',
  );

  const download = await api(
    `/api/me/vault/resources/${fileResource.body.id}/download?json=1`,
    elite.token,
  );
  assert.equal(download.status, 200, JSON.stringify(download.body));
  const downloaded = await fetch(download.body.url);
  assert.equal(downloaded.status, 200);
  assert.equal(await downloaded.text(), new TextDecoder().decode(contents));

  const external = await api(
    `/api/me/vault/resources/${linkResource.body.id}/download?json=1`,
    elite.token,
  );
  assert.equal(external.status, 200, JSON.stringify(external.body));
  assert.equal(external.body.url, 'https://example.com/vault-documentation');

  console.log('Elite Vault production smoke passed: admin isolation, nested folders, signed upload, published member listing, entitlement denial, secure download, external link, and hidden storage paths');
} finally {
  for (const id of resourceIds.reverse()) {
    await adminClient.from('vault_resources').delete().eq('id', id);
  }
  if (uploadedPath) await adminClient.storage.from('elite-vault').remove([uploadedPath]);
  for (const id of folderIds.reverse()) {
    await adminClient.from('vault_folders').delete().eq('id', id);
  }
  for (const id of users.reverse()) {
    await adminClient.auth.admin.deleteUser(id);
  }
}

