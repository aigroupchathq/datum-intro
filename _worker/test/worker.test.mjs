import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handle, purgeExpired, CONSENT_TEXT } from '../src/index.js';

// Minimal D1 stand-in over SQLite, running the real migration and SQL.
function makeDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_invites.sql', import.meta.url), 'utf8'));
  return {
    raw: db,
    prepare(sql) {
      let args = [];
      return { bind(...a) { args = a; return this; }, async run() { db.prepare(sql).run(...args); return { success: true }; } };
    },
  };
}

const ORIGIN = 'https://datumatelier.uk';
function env(db) {
  return { DB: db, TURNSTILE_SECRET: 'secret', ALLOWED_ORIGINS: `${ORIGIN},https://www.datumatelier.uk`, ALLOWED_HOSTNAMES: 'datumatelier.uk,www.datumatelier.uk' };
}
const pass = async () => new Response(JSON.stringify({ success: true, hostname: 'datumatelier.uk' }));
const fail = async () => new Response(JSON.stringify({ success: false }));
function req(body, { origin = ORIGIN, method = 'POST', type = 'application/json', path = '/api/invite' } = {}) {
  const headers = { 'Content-Type': type };
  if (origin) headers.Origin = origin;
  return new Request(`https://datumatelier.uk${path}`, { method, headers, body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined });
}
const good = { email: '  Owner@Example.co.uk ', role: 'owner', note: '1991 coupé, 64k miles', updates: true, token: 't' };
const rows = (db) => db.raw.prepare('SELECT * FROM invites').all();

test('stores a valid request, normalising the email and recording consent wording', async () => {
  const db = makeDb();
  const res = await handle(req(good), env(db), pass);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  const [r] = rows(db);
  assert.equal(r.email, 'owner@example.co.uk');
  assert.equal(r.role, 'owner');
  assert.equal(r.note, '1991 coupé, 64k miles');
  assert.equal(r.marketing_consent, 1);
  assert.equal(r.consent_text, CONSENT_TEXT);
});

test('marketing consent is off unless explicitly true', async () => {
  const db = makeDb();
  await handle(req({ ...good, updates: 'yes' }), env(db), pass);
  const [r] = rows(db);
  assert.equal(r.marketing_consent, 0);
  assert.equal(r.consent_text, null);
});

test('a second request from the same email updates rather than duplicates', async () => {
  const db = makeDb();
  await handle(req(good), env(db), pass);
  await handle(req({ ...good, role: 'workshop', updates: false }), env(db), pass);
  const all = rows(db);
  assert.equal(all.length, 1);
  assert.equal(all[0].role, 'workshop');
  assert.equal(all[0].marketing_consent, 0);
});

test('rejects bad input without storing anything', async () => {
  for (const [body, err] of [
    [{ ...good, email: 'not-an-email' }, 'email'],
    [{ ...good, role: 'admin' }, 'role'],
    [{ ...good, note: 'x'.repeat(501) }, 'note'],
    [{ ...good, token: '' }, 'check'],
  ]) {
    const db = makeDb();
    const res = await handle(req(body), env(db), pass);
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, err);
    assert.equal(rows(db).length, 0);
  }
});

test('a failed or foreign Turnstile check is refused', async () => {
  const db = makeDb();
  assert.equal((await handle(req(good), env(db), fail)).status, 400);
  const foreign = async () => new Response(JSON.stringify({ success: true, hostname: 'evil.example' }));
  assert.equal((await handle(req(good), env(db), foreign)).status, 400);
  assert.equal(rows(db).length, 0);
});

test('honeypot submissions look successful but store nothing', async () => {
  const db = makeDb();
  const res = await handle(req({ ...good, company: 'Spam Ltd' }), env(db), pass);
  assert.equal(res.status, 200);
  assert.equal(rows(db).length, 0);
});

test('refuses other origins, methods, content types, paths and oversized bodies', async () => {
  const db = makeDb();
  assert.equal((await handle(req(good, { origin: 'https://evil.example' }), env(db), pass)).status, 403);
  assert.equal((await handle(req(good, { origin: null }), env(db), pass)).status, 403);
  assert.equal((await handle(req(good, { method: 'GET' }), env(db), pass)).status, 405);
  assert.equal((await handle(req(good, { type: 'text/plain' }), env(db), pass)).status, 415);
  assert.equal((await handle(req(good, { path: '/api/other' }), env(db), pass)).status, 404);
  assert.equal((await handle(req('{' + ' '.repeat(5000) + '}'), env(db), pass)).status, 413);
  assert.equal((await handle(req('{bad json'), env(db), pass)).status, 400);
  assert.equal(rows(db).length, 0);
});

test('responses are never cached', async () => {
  const res = await handle(req(good), env(makeDb()), pass);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});

test('daily clean-up deletes requests older than 24 months and keeps recent ones', async () => {
  const db = makeDb();
  const ins = db.raw.prepare('INSERT INTO invites (email, role, created_at, updated_at) VALUES (?, ?, ?, ?)');
  const old = new Date(Date.now() - 25 * 30.5 * 864e5).toISOString();
  const recent = new Date(Date.now() - 30 * 864e5).toISOString();
  ins.run('old@example.com', 'owner', old, old);
  ins.run('new@example.com', 'owner', recent, recent);
  await purgeExpired(db);
  assert.deepEqual(rows(db).map((r) => r.email), ['new@example.com']);
});
