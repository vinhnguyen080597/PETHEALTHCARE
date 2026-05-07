import { Router } from 'express';
import multer from 'multer';
import { requireUser } from '../middleware/auth.js';
import {
  analyzePetHealthImages,
  buildHealthContextAppendix,
  validateImageFile,
  validateVideoFile,
} from '../services/aiDiagnosisService.js';
import { createAnalysisRecord, listAnalysesByPet } from '../repositories/analysisRepository.js';
import { getPetByIdForUser } from '../repositories/petRepository.js';
import { storeDiagnosisImage, storeDiagnosisVideo } from '../services/imageStorageService.js';
import { buildAnalysisCacheKey, getCachedAnalysis, setCachedAnalysis } from '../services/analysisCacheService.js';
import { getAnalysisProgress, setAnalysisProgress } from '../services/analysisProgressService.js';
import {
  acquireAnalysisLock,
  checkAnalysisCooldown,
  checkUserAnalysisRateLimit,
  getAnalysisGuardConfig,
  markAnalysisCompleted,
  markUserAnalysisAttempt,
  releaseAnalysisLock,
} from '../services/analysisTrafficGuardService.js';

const router = Router();
const guardConfig = getAnalysisGuardConfig();

/** Primary image 5MB; extras same; video up to 10MB (≈10s). Multer cap above any single file. */
const analysisUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

router.use(requireUser);

router.get('/progress/:requestId', async (req, res) => {
  const progress = getAnalysisProgress({
    requestId: req.params.requestId,
    userId: req.user.id,
  });
  if (!progress) {
    return res.status(404).json({ error: 'Progress not found' });
  }
  return res.json({ data: progress });
});

router.get('/:petId', async (req, res, next) => {
  try {
    const data = await listAnalysesByPet(req.user.id, req.params.petId);
    return res.json({ data });
  } catch (err) {
    return next(err);
  }
});

router.post(
  '/',
  analysisUpload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'photos', maxCount: 5 },
    { name: 'video', maxCount: 1 },
  ]),
  async (req, res, next) => {
    let acquiredLockKey = null;
    let requestId = null;
    try {
      const { petId } = req.body;
      requestId = typeof req.body.requestId === 'string' && req.body.requestId.trim() ? req.body.requestId.trim() : null;
      if (!petId) {
        if (requestId) {
          setAnalysisProgress({
            requestId,
            userId: req.user.id,
            stage: 'failed',
            status: 'failed',
            message: 'petId is required',
          });
        }
        return res.status(400).json({ error: 'petId is required' });
      }

      const pet = await getPetByIdForUser(req.user.id, petId, req.accessToken);
      if (!pet) {
        if (requestId) {
          setAnalysisProgress({
            requestId,
            userId: req.user.id,
            stage: 'failed',
            status: 'failed',
            message: 'Pet not found',
          });
        }
        return res.status(404).json({ error: 'Pet not found' });
      }

      const primary = req.files?.image?.[0];
      const extras = Array.isArray(req.files?.photos) ? req.files.photos : [];
      const video = req.files?.video?.[0];

      if (!primary) {
        if (requestId) {
          setAnalysisProgress({
            requestId,
            userId: req.user.id,
            stage: 'failed',
            status: 'failed',
            message: 'image file is required',
          });
        }
        return res.status(400).json({ error: 'image file is required (field name: image)' });
      }

      validateImageFile(primary);
      for (const f of extras) {
        validateImageFile(f);
      }
      if (video) {
        validateVideoFile(video);
      }

      const cacheKey = buildAnalysisCacheKey({
        userId: req.user.id,
        petId,
        primary,
        extras,
        video,
        body: req.body,
      });
      const cached = getCachedAnalysis(cacheKey);
      if (cached) {
        if (requestId) {
          setAnalysisProgress({
            requestId,
            userId: req.user.id,
            stage: 'done',
            status: 'done',
          });
        }
        return res.json({
          data: cached.analysis,
          metadata: {
            fileType: primary.mimetype,
            fileSize: primary.size,
            extraPhotos: extras.length,
            hasVideo: Boolean(video),
            cached: true,
            cacheAgeSeconds: Math.round(cached.ageMs / 1000),
          },
          warnings: ['Returned cached result from the last 24 hours for the same input.'],
        });
      }

      const lock = acquireAnalysisLock(req.user.id, petId);
      if (!lock.ok) {
        if (requestId) {
          setAnalysisProgress({
            requestId,
            userId: req.user.id,
            stage: 'failed',
            status: 'failed',
            message: 'Analysis already in progress',
          });
        }
        return res.status(409).json({
          error: `Analysis is already in progress for this pet. Please wait ${lock.retryAfterSeconds}s.`,
          code: 'ANALYSIS_IN_PROGRESS',
          retryAfterSeconds: lock.retryAfterSeconds,
        });
      }
      acquiredLockKey = lock.key;

      const cooldown = checkAnalysisCooldown(req.user.id, petId);
      if (!cooldown.ok) {
        if (requestId) {
          setAnalysisProgress({
            requestId,
            userId: req.user.id,
            stage: 'failed',
            status: 'failed',
            message: 'Cooldown in effect',
          });
        }
        return res.status(429).json({
          error: `Please wait ${cooldown.retryAfterSeconds}s before starting a new analysis for this pet.`,
          code: 'ANALYSIS_COOLDOWN',
          retryAfterSeconds: cooldown.retryAfterSeconds,
        });
      }

      const rate = checkUserAnalysisRateLimit(req.user.id);
      if (!rate.ok) {
        if (requestId) {
          setAnalysisProgress({
            requestId,
            userId: req.user.id,
            stage: 'failed',
            status: 'failed',
            message: 'Rate limit reached',
          });
        }
        return res.status(429).json({
          error:
            rate.limit === 'hour'
              ? `Rate limit reached: max ${guardConfig.hourlyLimit} analyses per hour. Try again in ${rate.retryAfterSeconds}s.`
              : `Daily limit reached: max ${guardConfig.dailyLimit} analyses per day. Try again in ${rate.retryAfterSeconds}s.`,
          code: rate.limit === 'hour' ? 'ANALYSIS_RATE_LIMIT_HOUR' : 'ANALYSIS_RATE_LIMIT_DAY',
          retryAfterSeconds: rate.retryAfterSeconds,
        });
      }
      markUserAnalysisAttempt(req.user.id, rate.kept);
      if (requestId) {
        setAnalysisProgress({
          requestId,
          userId: req.user.id,
          stage: 'analyzing',
          status: 'processing',
        });
      }

      const imageFilesForModel = [primary, ...extras];
      const healthAppendix = buildHealthContextAppendix(req.body);
      const aiResult = await analyzePetHealthImages(imageFilesForModel, healthAppendix);
      if (requestId) {
        setAnalysisProgress({
          requestId,
          userId: req.user.id,
          stage: 'saving',
          status: 'processing',
        });
      }

      let imageUrl = null;
      let extraImageUrls = [];
      let storageWarning = null;

      try {
        imageUrl = await storeDiagnosisImage({
          userId: req.user.id,
          petId,
          file: primary,
          accessToken: req.accessToken,
        });
        for (const f of extras) {
          try {
            const url = await storeDiagnosisImage({
              userId: req.user.id,
              petId,
              file: f,
              accessToken: req.accessToken,
            });
            extraImageUrls.push(url);
          } catch (e) {
            console.warn('Extra diagnosis image upload failed:', e?.message ?? e);
            storageWarning = storageWarning || 'Some extra photos were not stored.';
          }
        }
      } catch (err) {
        console.warn('Diagnosis image upload failed:', err?.message ?? err);
        storageWarning = 'Image upload failed. Diagnosis was saved without image.';
      }

      let videoUrl = null;
      if (video) {
        try {
          videoUrl = await storeDiagnosisVideo({
            userId: req.user.id,
            petId,
            file: video,
            accessToken: req.accessToken,
          });
        } catch (err) {
          console.warn('Diagnosis video upload failed:', err?.message ?? err);
          storageWarning = storageWarning
            ? `${storageWarning} Video not stored.`
            : 'Video upload failed. Diagnosis was still saved.';
        }
      }

      const weightRaw = typeof req.body.weightKg === 'string' ? req.body.weightKg.trim() : '';
      const weightNum = weightRaw === '' ? null : Number(weightRaw);
      const weightKg = Number.isFinite(weightNum) ? weightNum : null;

      const stored = await createAnalysisRecord({
        userId: req.user.id,
        petId,
        diagnosis: aiResult.diagnosis,
        severity: aiResult.severity,
        symptoms: aiResult.symptoms,
        treatment: aiResult.treatment,
        confidence: aiResult.confidence,
        disclaimer: aiResult.disclaimer,
        imageUrl,
        extraImageUrls,
        videoUrl,
        weightKg,
        vaccinationStatus: req.body.vaccinated === 'yes' || req.body.vaccinated === 'no' ? req.body.vaccinated : null,
        vaccineType:
          typeof req.body.vaccineType === 'string' && req.body.vaccineType.trim()
            ? req.body.vaccineType.trim()
            : null,
        neuteringStatus: req.body.neutered === 'yes' || req.body.neutered === 'no' ? req.body.neutered : null,
        medicalHistory:
          typeof req.body.medicalHistory === 'string' && req.body.medicalHistory.trim()
            ? req.body.medicalHistory.trim()
            : null,
        symptomDescription:
          typeof req.body.symptomDescription === 'string' && req.body.symptomDescription.trim()
            ? req.body.symptomDescription.trim()
            : null,
      });
      markAnalysisCompleted(req.user.id, petId);
      const enrichedData = {
        ...stored,
        status: aiResult.status,
        red_flags: aiResult.red_flags,
        diagnosis_candidates: aiResult.diagnosis_candidates,
        evidence: aiResult.evidence,
        missing_data: aiResult.missing_data,
        next_action: aiResult.next_action,
      };
      setCachedAnalysis(cacheKey, enrichedData);
      if (requestId) {
        setAnalysisProgress({
          requestId,
          userId: req.user.id,
          stage: 'done',
          status: 'done',
        });
      }

      return res.json({
        data: enrichedData,
        metadata: {
          fileType: primary.mimetype,
          fileSize: primary.size,
          extraPhotos: extras.length,
          hasVideo: Boolean(video),
          cached: false,
          ...(requestId ? { requestId } : {}),
        },
        warnings: storageWarning ? [storageWarning] : [],
      });
    } catch (err) {
      if (requestId) {
        setAnalysisProgress({
          requestId,
          userId: req.user.id,
          stage: 'failed',
          status: 'failed',
          message: err?.message ?? 'Analysis failed',
        });
      }
      return next(err);
    } finally {
      releaseAnalysisLock(acquiredLockKey);
    }
  },
);

export default router;
