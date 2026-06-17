#!/usr/bin/env node

const API_ORIGIN = (process.env.EXPO_PUBLIC_API_ORIGIN || 'https://pet-health-backend-serb.onrender.com').replace(
  /\/+$/,
  '',
);
const HEALTH_URL = `${API_ORIGIN}/health`;
const READY_URL = `${API_ORIGIN}/health/ready?deep=1`;
const LOGIN_URL = `${API_ORIGIN}/api/v1/auth/login`;

const TIMEOUT_MS = Number(process.env.RELEASE_VERIFY_TIMEOUT_MS || 30000);
const COLD_START_WARN_MS = Number(process.env.RELEASE_COLD_START_WARN_MS || 8000);
const COLD_START_FAIL_MS = Number(process.env.RELEASE_COLD_START_FAIL_MS || 25000);

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`WARN: ${message}`);
}

async function timedFetch(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      elapsedMs: Date.now() - started,
      text,
      json: safeJson(text),
    };
  } finally {
    clearTimeout(timer);
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function verifyHealth(label, url, predicate) {
  let result;
  try {
    result = await timedFetch(url);
  } catch (error) {
    fail(`${label} request failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }

  if (!result.ok) {
    fail(`${label} returned HTTP ${result.status} in ${result.elapsedMs}ms`);
    return result;
  }

  if (!predicate(result.json)) {
    fail(`${label} returned unexpected payload: ${result.text.slice(0, 240)}`);
    return result;
  }

  console.log(`OK  ${label} -> ${url} (${result.elapsedMs}ms)`);
  return result;
}

async function main() {
  console.log(`Verifying production backend at ${API_ORIGIN}`);

  const health = await verifyHealth('Health', HEALTH_URL, (body) => body?.status === 'ok');
  const ready = await verifyHealth('Readiness', READY_URL, (body) => body?.status === 'ready');

  if (health && health.elapsedMs >= COLD_START_FAIL_MS) {
    fail(`Health check took ${health.elapsedMs}ms (limit ${COLD_START_FAIL_MS}ms). Backend may be too slow for App Review.`);
  } else if (health && health.elapsedMs >= COLD_START_WARN_MS) {
    warn(`Health check took ${health.elapsedMs}ms. Render free tier cold starts can block login during review.`);
  }

  if (ready?.json?.warnings?.length) {
    for (const warning of ready.json.warnings) {
      warn(`Readiness warning: ${warning}`);
    }
  }

  let loginProbe;
  try {
    loginProbe = await timedFetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'release-check@pethealth.local', password: 'invalid-password-for-probe' }),
    });
  } catch (error) {
    fail(`Auth probe failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (loginProbe) {
    if (loginProbe.status >= 500) {
      fail(`Auth probe returned HTTP ${loginProbe.status}. API may be unavailable for reviewers.`);
    } else {
      console.log(`OK  Auth probe -> ${LOGIN_URL} (${loginProbe.status}, ${loginProbe.elapsedMs}ms)`);
    }
  }

  if (process.exitCode === 1) {
    console.error('\nProduction backend verification failed.');
    console.error('Before App Store review, use a non-sleeping backend plan and rerun yarn release:verify:backend.');
    process.exit(1);
  }

  console.log('\nProduction backend verification passed.');
  if ((health?.elapsedMs || 0) >= COLD_START_WARN_MS) {
    console.log('Note: backend responded, but cold-start latency is high. Keep the service warm before review.');
  }
}

await main();
