// Datum Atelier invitation endpoint: POST /api/invite
// Runs on Cloudflare Workers with a D1 database (binding DB) and Turnstile (secret TURNSTILE_SECRET).

export const ROLES = ['owner', 'collector', 'workshop', 'other'];
export const NOTE_MAX = 500;
export const RETENTION_MONTHS = 24;
// Must match the wording beside the checkbox on the site, word for word.
export const CONSENT_TEXT = 'Email me occasional news about Datum. Optional, and you can stop at any time.';

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });
}

function list(value) {
  return String(value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

export function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'invalid' };
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email.length > 254 || !EMAIL_RE.test(email)) return { error: 'email' };
  const role = typeof body.role === 'string' ? body.role : '';
  if (!ROLES.includes(role)) return { error: 'role' };
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (note.length > NOTE_MAX) return { error: 'note' };
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token || token.length > 2048) return { error: 'check' };
  return { value: { email, role, note, updates: body.updates === true, token } };
}

export async function verifyTurnstile(token, env, ip, fetchImpl = fetch) {
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const res = await fetchImpl(SITEVERIFY, { method: 'POST', body: form });
    const out = await res.json();
    if (!out.success) return false;
    const hosts = list(env.ALLOWED_HOSTNAMES);
    return hosts.length === 0 || hosts.includes(out.hostname);
  } catch {
    return false;
  }
}

export async function saveInvite(db, v, now = new Date()) {
  const ts = now.toISOString();
  await db
    .prepare(
      `INSERT INTO invites (email, role, note, marketing_consent, consent_text, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
       ON CONFLICT(email) DO UPDATE SET
         role = excluded.role,
         note = excluded.note,
         marketing_consent = excluded.marketing_consent,
         consent_text = excluded.consent_text,
         updated_at = excluded.updated_at`
    )
    .bind(v.email, v.role, v.note, v.updates ? 1 : 0, v.updates ? CONSENT_TEXT : null, ts)
    .run();
}

export async function purgeExpired(db) {
  await db
    .prepare(`DELETE FROM invites WHERE updated_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?1)`)
    .bind(`-${RETENTION_MONTHS} months`)
    .run();
}

export async function handle(request, env, fetchImpl = fetch) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/invite') return json({ ok: false, error: 'not_found' }, 404);
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, { Allow: 'POST' });

  const origin = request.headers.get('Origin');
  if (!origin || !list(env.ALLOWED_ORIGINS).includes(origin)) return json({ ok: false, error: 'origin' }, 403);
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) {
    return json({ ok: false, error: 'type' }, 415);
  }

  const raw = await request.text();
  if (raw.length > 4096) return json({ ok: false, error: 'size' }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: 'invalid' }, 400);
  }

  // Honeypot: people never fill the hidden "company" field. Pretend success, store nothing.
  if (body && typeof body.company === 'string' && body.company.trim() !== '') return json({ ok: true });

  const { value, error } = validate(body);
  if (error) return json({ ok: false, error }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!(await verifyTurnstile(value.token, env, ip, fetchImpl))) return json({ ok: false, error: 'check' }, 400);

  try {
    await saveInvite(env.DB, value);
  } catch {
    return json({ ok: false, error: 'server' }, 500);
  }
  return json({ ok: true });
}

export default {
  fetch: (request, env) => handle(request, env),
  scheduled: (_event, env, ctx) => ctx.waitUntil(purgeExpired(env.DB)),
};
