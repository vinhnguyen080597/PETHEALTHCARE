#!/usr/bin/env node
/**
 * Smoke verification for deployed backend (Render).
 * Usage: node scripts/verify-deploy.mjs [baseOrigin]
 * Optional env: VERIFY_EMAIL, VERIFY_PASSWORD for authenticated checks.
 */

const BASE = (process.argv[2] || 'https://pet-health-backend-serb.onrender.com').replace(/\/+$/, '');
const API = `${BASE}/api/v1`;
const VERIFY_EMAIL = process.env.VERIFY_EMAIL?.trim();
const VERIFY_PASSWORD = process.env.VERIFY_PASSWORD;

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function request(method, url, { body, token, headers = {} } = {}) {
  const init = {
    method,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  };
  if (token) init.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json, text };
}

async function expectStatus(name, method, url, expectedStatus, opts = {}) {
  const res = await request(method, url, opts);
  if (res.status === expectedStatus) {
    pass(name, `HTTP ${res.status}`);
    return res;
  }
  fail(name, `expected ${expectedStatus}, got ${res.status}: ${JSON.stringify(res.json)?.slice(0, 180)}`);
  return res;
}

async function runPublicChecks() {
  console.log('\n=== Infrastructure ===');
  const health = await request('GET', `${BASE}/health`);
  if (health.status === 200 && health.json?.status === 'ok') pass('GET /health');
  else fail('GET /health', JSON.stringify(health.json));

  const ready = await request('GET', `${BASE}/health/ready?deep=1`);
  const checks = ready.json?.checks ?? {};
  if (ready.status === 200 && ready.json?.status === 'ready') {
    pass('GET /health/ready?deep=1', `supabase=${checks.supabase}, storagePrivate=${checks.storagePrivate}, storagePublic=${checks.storagePublic}`);
  } else {
    fail('GET /health/ready?deep=1', JSON.stringify(ready.json));
  }

  console.log('\n=== Auth validation (no token) ===');
  await expectStatus('POST /auth/login missing body', 'POST', `${API}/auth/login`, 400, {
    body: {},
  });
  await expectStatus('POST /auth/signup missing body', 'POST', `${API}/auth/signup`, 400, {
    body: { email: 'x@y.com' },
  });
  await expectStatus('POST /auth/forgot-password missing email', 'POST', `${API}/auth/forgot-password`, 400, {
    body: {},
  });
  await expectStatus('POST /auth/oauth/google missing token', 'POST', `${API}/auth/oauth/google`, 400, {
    body: {},
  });

  console.log('\n=== Protected routes require auth ===');
  const protectedPaths = [
    ['GET', `${API}/auth/me`],
    ['GET', `${API}/pets`],
    ['GET', `${API}/ai-credits/summary`],
    ['GET', `${API}/pet-feed/posts`],
    ['GET', `${API}/core-care/pets/00000000-0000-4000-8000-000000000001/records`],
    ['GET', `${API}/analysis/00000000-0000-4000-8000-000000000001`],
  ];
  for (const [method, url] of protectedPaths) {
    await expectStatus(`${method} ${url.replace(API, '/api/v1')} without token`, method, url, 401);
  }

  console.log('\n=== Admin routes reject missing secret ===');
  await expectStatus('GET /admin/accounts without secret', 'GET', `${API}/admin/accounts`, 401);
  await expectStatus('GET /admin/ai-ops-summary without secret', 'GET', `${API}/admin/ai-ops-summary`, 401);
}

async function runAuthenticatedChecks(token) {
  console.log('\n=== Authenticated API checks ===');
  const me = await request('GET', `${API}/auth/me`, { token });
  const account = me.json?.data;
  const userId = account?.user_id ?? account?.user?.id;
  if (me.status === 200 && userId) {
    pass('GET /auth/me', `userId=${String(userId).slice(0, 8)}… role=${account?.primary_role ?? '?'}`);
  } else {
    fail('GET /auth/me', JSON.stringify(me.json));
    return;
  }

  const credits = await request('GET', `${API}/ai-credits/summary`, { token });
  if (credits.status === 200 && credits.json?.data?.account) {
    const acct = credits.json.data.account;
    const trials = acct.featureTrialBalance ?? acct.feature_trial_balance;
    pass(
      'GET /ai-credits/summary',
      `balance=${acct.creditBalance ?? acct.credit_balance}, trials=${JSON.stringify(trials)}`,
    );
  } else {
    fail('GET /ai-credits/summary', JSON.stringify(credits.json));
  }

  const ledger = await request('GET', `${API}/ai-credits/ledger`, { token });
  if (ledger.status === 200 && Array.isArray(ledger.json?.data)) {
    pass('GET /ai-credits/ledger', `${ledger.json.data.length} entries`);
  } else {
    fail('GET /ai-credits/ledger', JSON.stringify(ledger.json));
  }

  const pets = await request('GET', `${API}/pets`, { token });
  if (pets.status === 200 && Array.isArray(pets.json?.data)) {
    pass('GET /pets', `${pets.json.data.length} pet(s)`);
    const pet = pets.json.data[0];
    if (pet?.id) {
      const records = await request('GET', `${API}/core-care/pets/${pet.id}/records`, { token });
      if (records.status === 200 && Array.isArray(records.json?.data)) {
        pass('GET /core-care/pets/:petId/records', `${records.json.data.length} record(s), summary keys=${Object.keys(records.json.summary ?? {}).join(',')}`);
      } else {
        fail('GET /core-care/pets/:petId/records', JSON.stringify(records.json));
      }

      const analyses = await request('GET', `${API}/analysis/${pet.id}`, { token });
      if (analyses.status === 200 && Array.isArray(analyses.json?.data)) {
        pass('GET /analysis/:petId', `${analyses.json.data.length} analysis(es)`);
      } else {
        fail('GET /analysis/:petId', JSON.stringify(analyses.json));
      }
    }
  } else {
    fail('GET /pets', JSON.stringify(pets.json));
  }

  const feed = await request('GET', `${API}/pet-feed/posts?limit=5`, { token });
  if (feed.status === 200 && Array.isArray(feed.json?.data)) {
    pass('GET /pet-feed/posts', `${feed.json.data.length} post(s) on page`);
  } else {
    fail('GET /pet-feed/posts', JSON.stringify(feed.json));
  }

  const breeders = await request('GET', `${API}/pet-feed/breeders`, { token });
  if (breeders.status === 200 && Array.isArray(breeders.json?.data)) {
    pass('GET /pet-feed/breeders', `${breeders.json.data.length} profile(s)`);
  } else {
    fail('GET /pet-feed/breeders', JSON.stringify(breeders.json));
  }

  const announcements = await request('GET', `${API}/pet-feed/posts?kind=announcement&limit=5`, { token });
  if (announcements.status === 200 && Array.isArray(announcements.json?.data)) {
    pass('GET /pet-feed/posts?kind=announcement', `${announcements.json.data.length} announcement(s)`);
  } else {
    fail('GET /pet-feed/posts?kind=announcement', JSON.stringify(announcements.json));
  }
}

async function tryLogin() {
  if (!VERIFY_EMAIL || !VERIFY_PASSWORD) {
    console.log('\n=== Authenticated checks skipped ===');
    console.log('Set VERIFY_EMAIL and VERIFY_PASSWORD env vars to test logged-in APIs.');
    return null;
  }

  console.log('\n=== Login ===');
  const login = await request('POST', `${API}/auth/login`, {
    body: { email: VERIFY_EMAIL, password: VERIFY_PASSWORD },
  });
  const token = login.json?.data?.session?.access_token;
  if (login.status === 200 && token) {
    pass('POST /auth/login', VERIFY_EMAIL);
    return token;
  }
  fail('POST /auth/login', JSON.stringify(login.json));
  return null;
}

async function main() {
  console.log(`Verifying backend at ${BASE}`);
  await runPublicChecks();
  const token = await tryLogin();
  if (token) await runAuthenticatedChecks(token);

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
