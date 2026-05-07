function intFromEnv(name, fallback) {
  const raw = process.env[name];
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

const IN_FLIGHT_TTL_SECONDS = intFromEnv('ANALYSIS_IN_FLIGHT_TTL_SECONDS', 5 * 60);
const COOLDOWN_SECONDS = intFromEnv('ANALYSIS_COOLDOWN_SECONDS', 90);
const HOURLY_LIMIT = intFromEnv('ANALYSIS_RATE_LIMIT_HOURLY', 10);
const DAILY_LIMIT = intFromEnv('ANALYSIS_RATE_LIMIT_DAILY', 40);

const IN_FLIGHT_TTL_MS = IN_FLIGHT_TTL_SECONDS * 1000;
const COOLDOWN_MS = COOLDOWN_SECONDS * 1000;

/** @type {Map<string, number>} */
const inFlightLocks = new Map();
/** @type {Map<string, number>} */
const lastCompletedAt = new Map();
/** @type {Map<string, number[]>} */
const userRequestTimes = new Map();

function nowMs() {
  return Date.now();
}

function cleanupLocks() {
  const now = nowMs();
  for (const [key, expiresAt] of inFlightLocks.entries()) {
    if (expiresAt <= now) inFlightLocks.delete(key);
  }
}

function lockKeyFor(userId, petId) {
  return `${userId}:${petId}`;
}

export function acquireAnalysisLock(userId, petId) {
  cleanupLocks();
  const key = lockKeyFor(userId, petId);
  const now = nowMs();
  const existing = inFlightLocks.get(key);
  if (existing && existing > now) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing - now) / 1000)),
    };
  }
  inFlightLocks.set(key, now + IN_FLIGHT_TTL_MS);
  return { ok: true, key };
}

export function releaseAnalysisLock(lockKey) {
  if (!lockKey) return;
  inFlightLocks.delete(lockKey);
}

export function checkAnalysisCooldown(userId, petId) {
  const key = lockKeyFor(userId, petId);
  const prev = lastCompletedAt.get(key);
  if (!prev) return { ok: true };
  const remainMs = COOLDOWN_MS - (nowMs() - prev);
  if (remainMs > 0) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil(remainMs / 1000)),
    };
  }
  return { ok: true };
}

export function markAnalysisCompleted(userId, petId) {
  lastCompletedAt.set(lockKeyFor(userId, petId), nowMs());
}

export function checkUserAnalysisRateLimit(userId) {
  const now = nowMs();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const current = userRequestTimes.get(userId) ?? [];
  const kept = current.filter((t) => t >= oneDayAgo);
  const hourCount = kept.filter((t) => t >= oneHourAgo).length;
  const dayCount = kept.length;

  if (hourCount >= HOURLY_LIMIT) {
    const earliestInHour = kept.find((t) => t >= oneHourAgo) ?? now;
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((earliestInHour + 60 * 60 * 1000 - now) / 1000)),
      limit: 'hour',
    };
  }
  if (dayCount >= DAILY_LIMIT) {
    const earliestInDay = kept[0] ?? now;
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((earliestInDay + 24 * 60 * 60 * 1000 - now) / 1000)),
      limit: 'day',
    };
  }
  return { ok: true, kept };
}

export function markUserAnalysisAttempt(userId, keptList) {
  const next = [...(keptList ?? userRequestTimes.get(userId) ?? []), nowMs()];
  userRequestTimes.set(userId, next);
}

export function getAnalysisGuardConfig() {
  return {
    inFlightTtlSeconds: IN_FLIGHT_TTL_SECONDS,
    cooldownSeconds: COOLDOWN_SECONDS,
    hourlyLimit: HOURLY_LIMIT,
    dailyLimit: DAILY_LIMIT,
  };
}

