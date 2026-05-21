import { Router } from 'express';
import multer from 'multer';
import { requireUser } from '../middleware/auth.js';
import { getPetByIdForUser } from '../repositories/petRepository.js';
import { analyzePetBreedFromLabeledImages } from '../services/petBreedRecognitionService.js';
import { validateImageFile } from '../services/aiDiagnosisService.js';
import {
  attachReservationContext,
  recordAiUsageEvent,
  refundAiCredits,
  reserveAiCredits,
} from '../services/aiEconomicsService.js';
import { validateBreedRecognitionPayload } from '../services/aiPayloadQualityService.js';
import { recordProductEvent } from '../services/productAnalyticsService.js';

const SLOT_ORDER = ['face', 'eyes', 'pawPads', 'coat', 'fullBodySun', 'parentPedigree'];
const REQUIRED_SLOTS = ['face', 'eyes', 'coat'];
const SUPPORTED_SPECIES = new Set(['cat', 'dog']);
const BREED_IN_FLIGHT_TTL_MS = intFromEnv('BREED_RECOGNITION_IN_FLIGHT_TTL_SECONDS', 5 * 60) * 1000;
const BREED_COOLDOWN_MS = intFromEnv('BREED_RECOGNITION_COOLDOWN_SECONDS', 120) * 1000;
const BREED_HOURLY_LIMIT = intFromEnv('BREED_RECOGNITION_RATE_LIMIT_HOURLY', 8);
const BREED_DAILY_LIMIT = intFromEnv('BREED_RECOGNITION_RATE_LIMIT_DAILY', 20);

const inFlight = new Map();
const lastCompletedAt = new Map();
const userRequestTimes = new Map();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();
router.use(requireUser);

function intFromEnv(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function guardKey(userId, petId) {
  return `${userId}:${petId}`;
}

function cleanupInFlight() {
  const now = Date.now();
  for (const [key, expiresAt] of inFlight.entries()) {
    if (expiresAt <= now) inFlight.delete(key);
  }
}

function acquireBreedLock(userId, petId) {
  cleanupInFlight();
  const key = guardKey(userId, petId);
  const now = Date.now();
  const existing = inFlight.get(key);
  if (existing && existing > now) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((existing - now) / 1000)) };
  }
  inFlight.set(key, now + BREED_IN_FLIGHT_TTL_MS);
  return { ok: true, key };
}

function checkBreedCooldown(userId, petId) {
  const prev = lastCompletedAt.get(guardKey(userId, petId));
  if (!prev) return { ok: true };
  const remainMs = BREED_COOLDOWN_MS - (Date.now() - prev);
  if (remainMs <= 0) return { ok: true };
  return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(remainMs / 1000)) };
}

function checkBreedRateLimit(userId) {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const kept = (userRequestTimes.get(userId) ?? []).filter((t) => t >= oneDayAgo);
  const hourCount = kept.filter((t) => t >= oneHourAgo).length;
  if (hourCount >= BREED_HOURLY_LIMIT) {
    const earliest = kept.find((t) => t >= oneHourAgo) ?? now;
    return { ok: false, limit: 'hour', retryAfterSeconds: Math.max(1, Math.ceil((earliest + 60 * 60 * 1000 - now) / 1000)) };
  }
  if (kept.length >= BREED_DAILY_LIMIT) {
    const earliest = kept[0] ?? now;
    return { ok: false, limit: 'day', retryAfterSeconds: Math.max(1, Math.ceil((earliest + 24 * 60 * 60 * 1000 - now) / 1000)) };
  }
  return { ok: true, kept };
}

function markBreedAttempt(userId, keptList) {
  userRequestTimes.set(userId, [...(keptList ?? userRequestTimes.get(userId) ?? []), Date.now()]);
}

router.post(
  '/',
  upload.fields(SLOT_ORDER.map((name) => ({ name, maxCount: 1 }))),
  async (req, res, next) => {
    let acquiredLockKey = null;
    let creditReservation = null;
    try {
      const petId = typeof req.body?.petId === 'string' ? req.body.petId.trim() : '';
      if (!petId) {
        return res.status(400).json({ error: 'petId is required', code: 'MISSING_PET_ID' });
      }

      const pet = await getPetByIdForUser(req.user.id, petId, req.accessToken);
      if (!pet) {
        return res.status(404).json({ error: 'Pet not found', code: 'PET_NOT_FOUND' });
      }
      const speciesNorm = String(pet.species || '')
        .toLowerCase()
        .trim();
      if (!SUPPORTED_SPECIES.has(speciesNorm)) {
        return res.status(400).json({
          error: 'Breed recognition is only available for cats and dogs',
          code: 'SPECIES_NOT_SUPPORTED',
        });
      }

      /** @type {Record<string, import('multer').File>} */
      const bySlot = {};
      for (const name of SLOT_ORDER) {
        const arr = req.files?.[name];
        if (Array.isArray(arr) && arr[0]) bySlot[name] = arr[0];
      }

      for (const slot of REQUIRED_SLOTS) {
        if (!bySlot[slot]) {
          return res.status(400).json({
            error: `Missing required photo for slot: ${slot}`,
            code: 'MISSING_REQUIRED_PHOTO',
          });
        }
      }

      const ordered = SLOT_ORDER.filter((k) => bySlot[k]).map((k) => ({ slot: k, file: bySlot[k] }));
      for (const { file } of ordered) {
        validateImageFile(file);
      }
      const quality = validateBreedRecognitionPayload({ ordered, locale: req.body?.locale });

      const lock = acquireBreedLock(req.user.id, petId);
      if (!lock.ok) {
        return res.status(409).json({
          error: `Breed recognition is already in progress for this pet. Please wait ${lock.retryAfterSeconds}s.`,
          code: 'BREED_RECOGNITION_IN_PROGRESS',
          retryAfterSeconds: lock.retryAfterSeconds,
        });
      }
      acquiredLockKey = lock.key;

      const cooldown = checkBreedCooldown(req.user.id, petId);
      if (!cooldown.ok) {
        return res.status(429).json({
          error: `Please wait ${cooldown.retryAfterSeconds}s before starting a new breed recognition for this pet.`,
          code: 'BREED_RECOGNITION_COOLDOWN',
          retryAfterSeconds: cooldown.retryAfterSeconds,
        });
      }

      const rate = checkBreedRateLimit(req.user.id);
      if (!rate.ok) {
        return res.status(429).json({
          error:
            rate.limit === 'hour'
              ? `Rate limit reached: max ${BREED_HOURLY_LIMIT} breed recognitions per hour. Try again in ${rate.retryAfterSeconds}s.`
              : `Daily limit reached: max ${BREED_DAILY_LIMIT} breed recognitions per day. Try again in ${rate.retryAfterSeconds}s.`,
          code: rate.limit === 'hour' ? 'BREED_RECOGNITION_RATE_LIMIT_HOUR' : 'BREED_RECOGNITION_RATE_LIMIT_DAY',
          retryAfterSeconds: rate.retryAfterSeconds,
        });
      }

      const reserve = await reserveAiCredits({
        userId: req.user.id,
        feature: 'breed_recognition',
        petId,
        details: { imageCount: quality.imageCount },
        metadata: { imageSlots: quality.slots, species: speciesNorm, qualityGate: 'passed' },
      });
      if (!reserve.ok) {
        return res.status(reserve.status ?? 402).json({
          error: reserve.error,
          code: reserve.code,
          creditBalance: reserve.creditBalance,
          creditCost: reserve.creditCost,
          monthlyResetAt: reserve.monthlyResetAt,
        });
      }
      creditReservation = attachReservationContext(reserve, { userId: req.user.id, feature: 'breed_recognition', petId });
      markBreedAttempt(req.user.id, rate.kept);

      const locale = quality.locale;
      const data = await analyzePetBreedFromLabeledImages(ordered, speciesNorm, locale);
      lastCompletedAt.set(guardKey(req.user.id, petId), Date.now());
      void recordProductEvent({
        userId: req.user.id,
        petId,
        event: 'ai_breed_recognition_completed',
        metadata: { species: speciesNorm, imageCount: quality.imageCount },
      });
      await recordAiUsageEvent({
        userId: req.user.id,
        petId,
        feature: 'breed_recognition',
        status: 'ok',
        reservation: creditReservation,
        estimate: creditReservation?.estimate,
        metadata: { imageSlots: quality.slots, species: speciesNorm, locale },
      });
      return res.json({ data });
    } catch (err) {
      await refundAiCredits(creditReservation, 'ai_error_refund');
      if (creditReservation) {
        await recordAiUsageEvent({
          userId: req.user.id,
          petId: typeof req.body?.petId === 'string' ? req.body.petId.trim() : null,
          feature: 'breed_recognition',
          status: 'failed',
          reservation: creditReservation,
          estimate: creditReservation.estimate,
          metadata: { reason: err?.message ?? 'breed recognition failed' },
        });
      }
      return next(err);
    } finally {
      if (acquiredLockKey) inFlight.delete(acquiredLockKey);
    }
  },
);

export default router;
