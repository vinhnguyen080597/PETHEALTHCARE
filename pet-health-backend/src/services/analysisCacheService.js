import { createHash } from 'node:crypto';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, { createdAt: number, analysis: any }>} */
const analysisCache = new Map();

function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function stableBodySubset(body) {
  const loc = typeof body.locale === 'string' ? body.locale.trim().toLowerCase() : '';
  const locale = loc.startsWith('vi') ? 'vi' : 'en';

  return {
    locale,
    weightKg: normalizeText(body.weightKg),
    vaccinated: normalizeText(body.vaccinated),
    vaccineType: normalizeText(body.vaccineType),
    neutered: normalizeText(body.neutered),
    medicalHistory: normalizeText(body.medicalHistory),
    symptomDescription: normalizeText(body.symptomDescription),
  };
}

function hashFile(file) {
  return createHash('sha256').update(file.buffer).digest('hex');
}

function fileHashList(files) {
  return (Array.isArray(files) ? files : []).map(hashFile);
}

function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of analysisCache.entries()) {
    if (now - entry.createdAt > CACHE_TTL_MS) {
      analysisCache.delete(key);
    }
  }
}

/**
 * Build a stable cache key for "same pet + same media + same health context".
 */
export function buildAnalysisCacheKey({ userId, petId, primary, extras, video, body }) {
  const payload = {
    userId,
    petId,
    primaryHash: primary ? hashFile(primary) : '',
    extraHashes: fileHashList(extras),
    videoHash: video ? hashFile(video) : '',
    body: stableBodySubset(body),
  };
  const payloadJson = JSON.stringify(payload);
  const fingerprint = createHash('sha256').update(payloadJson).digest('hex');
  return `${userId}:${petId}:${fingerprint}`;
}

export function getCachedAnalysis(cacheKey) {
  pruneExpired();
  const entry = analysisCache.get(cacheKey);
  if (!entry) return null;
  return {
    analysis: entry.analysis,
    ageMs: Date.now() - entry.createdAt,
  };
}

export function setCachedAnalysis(cacheKey, analysis) {
  pruneExpired();
  analysisCache.set(cacheKey, {
    createdAt: Date.now(),
    analysis,
  });
}

