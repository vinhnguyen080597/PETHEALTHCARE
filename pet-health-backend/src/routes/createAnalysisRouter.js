import { Router } from 'express';
import multer from 'multer';
import {
  attachReservationContext,
  recordAiUsageEvent,
  refundAiCredits,
  reserveAiCredits,
} from '../services/aiEconomicsService.js';
import {
  validateHealthAnalysisPayload,
  validateTranslationRecords,
  validateTranslationRequestPayload,
} from '../services/aiPayloadQualityService.js';
import { recordProductEvent } from '../services/productAnalyticsService.js';

export function createAnalysisRouter(deps) {
  const {
    requireUser,
    analyzePetHealthImages,
    buildHealthContextAppendix,
    validateImageFile,
    validateVideoFile,
    createAnalysisRecord,
    getAnalysisByIdForUser,
    listAnalysesByPet,
    mergeAnalysisDisplayTranslation,
    mergeDisplayLocaleRow,
    extractTranslatablePayload,
    translateAnalysisFieldsToVietnamese,
    translateManyAnalysisRecordsToVietnamese,
    getPetByIdForUser,
    storeDiagnosisImage,
    storeDiagnosisVideo,
    buildAnalysisCacheKey,
    getCachedAnalysis,
    setCachedAnalysis,
    getAnalysisProgress,
    setAnalysisProgress,
    acquireAnalysisLock,
    checkAnalysisCooldown,
    checkUserAnalysisRateLimit,
    getAnalysisGuardConfig,
    markAnalysisCompleted,
    markUserAnalysisAttempt,
    releaseAnalysisLock,
  } = deps;

  const router = Router();
  const guardConfig = getAnalysisGuardConfig();

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

  router.get('/item/:analysisId', async (req, res, next) => {
    try {
      const analysisId = typeof req.params.analysisId === 'string' ? req.params.analysisId.trim() : '';
      if (!analysisId) {
        return res.status(400).json({ error: 'analysisId is required', code: 'MISSING_ANALYSIS_ID' });
      }
      const q = typeof req.query.displayLocale === 'string' ? req.query.displayLocale.trim() : '';
      const displayLocale = q || (typeof req.query.locale === 'string' ? req.query.locale.trim() : '');
      const row = await getAnalysisByIdForUser(req.user.id, analysisId);
      if (!row) {
        return res.status(404).json({ error: 'Analysis not found', code: 'ANALYSIS_NOT_FOUND' });
      }
      const loc =
        typeof displayLocale === 'string' && displayLocale.trim().slice(0, 2).toLowerCase().startsWith('vi')
          ? 'vi'
          : null;
      const data = loc ? mergeDisplayLocaleRow(row, loc) : row;
      return res.json({ data });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/:petId', async (req, res, next) => {
    try {
      const q = typeof req.query.displayLocale === 'string' ? req.query.displayLocale.trim() : '';
      const displayLocale = q || (typeof req.query.locale === 'string' ? req.query.locale.trim() : '');
      const limit = req.query.limit;
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
      const view = typeof req.query.view === 'string' ? req.query.view : 'list';
      const page = await listAnalysesByPet(req.user.id, req.params.petId, {
        displayLocale: displayLocale || null,
        limit,
        cursor,
        view,
      });
      return res.json(page);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/translate-display', async (req, res, next) => {
    let creditReservation = null;
    try {
      const { targetLocale, analysisIds, petIdFilter } = validateTranslationRequestPayload(req.body);

      const pending = [];
      for (const id of analysisIds) {
        const row = await getAnalysisByIdForUser(req.user.id, id);
        if (!row) continue;
        if (petIdFilter && row.pet_id !== petIdFilter) continue;
        const ol = String(row.output_locale || '').toLowerCase();
        if (ol.startsWith('vi')) continue;
        if (row.display_translations?.vi && typeof row.display_translations.vi === 'object') continue;
        pending.push(row);
      }
      const pendingRecords = validateTranslationRecords(
        pending.map((row) => ({ id: row.id, ...extractTranslatablePayload(row) })),
      );

      const viOverlayById = new Map();
      const BATCH = 6;
      if (pendingRecords.length > 0) {
        const reserve = await reserveAiCredits({
          userId: req.user.id,
          feature: 'analysis_translation',
          details: { recordCount: pendingRecords.length },
          metadata: { analysisCount: pendingRecords.length, targetLocale, qualityGate: 'passed' },
        });
        if (!reserve.ok) {
          return res.status(reserve.status ?? 402).json({
            error: reserve.error,
            code: reserve.code,
            creditBalance: reserve.creditBalance,
            creditCost: reserve.creditCost,
            featureTrialBalance: reserve.featureTrialBalance,
            feature: reserve.feature,
            monthlyResetAt: reserve.monthlyResetAt,
          });
        }
        creditReservation = attachReservationContext(reserve, { userId: req.user.id, feature: 'analysis_translation' });
      }

      for (let i = 0; i < pendingRecords.length; i += BATCH) {
        const records = pendingRecords.slice(i, i + BATCH);
        let translatedList = [];
        try {
          translatedList = await translateManyAnalysisRecordsToVietnamese(records);
        } catch {
          translatedList = [];
        }
        const byId = new Map(
          translatedList.filter((t) => t && typeof t === 'object' && t.id).map((t) => [String(t.id), t]),
        );

        for (const r of records) {
          let pack = byId.get(String(r.id));
          if (!pack || typeof pack !== 'object') {
            try {
              const { id: _recordId, ...payload } = r;
              pack = await translateAnalysisFieldsToVietnamese(payload);
            } catch {
              continue;
            }
          }
          const { id: _drop, ...viFields } = pack;
          viOverlayById.set(r.id, viFields);
          await mergeAnalysisDisplayTranslation(req.user.id, r.id, 'vi', viFields);
        }
      }

      if (pendingRecords.length > 0) {
        await recordAiUsageEvent({
          userId: req.user.id,
          feature: 'analysis_translation',
          status: 'ok',
          reservation: creditReservation,
          estimate: creditReservation?.estimate,
          metadata: { analysisCount: pendingRecords.length, translatedCount: viOverlayById.size, targetLocale },
        });
      }

      const out = [];
      for (const id of analysisIds) {
        const fresh = await getAnalysisByIdForUser(req.user.id, id);
        if (!fresh) continue;
        const overlay = viOverlayById.get(id);
        const persistedVi = fresh.display_translations?.vi && typeof fresh.display_translations.vi === 'object';
        const row =
          overlay && !persistedVi
            ? {
                ...fresh,
                display_translations: {
                  ...(typeof fresh.display_translations === 'object' && fresh.display_translations
                    ? fresh.display_translations
                    : {}),
                  vi: overlay,
                },
              }
            : fresh;
        out.push(mergeDisplayLocaleRow(row, 'vi'));
      }
      return res.json({ data: out });
    } catch (err) {
      await refundAiCredits(creditReservation, 'ai_error_refund');
      if (creditReservation) {
        await recordAiUsageEvent({
          userId: req.user.id,
          feature: 'analysis_translation',
          status: 'failed',
          reservation: creditReservation,
          estimate: creditReservation.estimate,
          metadata: { reason: err?.message ?? 'translation failed' },
        });
      }
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
      let creditReservation = null;
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
        for (const f of extras) validateImageFile(f);
        if (video) validateVideoFile(video);
        const quality = validateHealthAnalysisPayload({ body: req.body, primary, extras, video });
        req.body = quality.body;

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
          await recordAiUsageEvent({
            userId: req.user.id,
            petId,
            feature: 'health_analysis',
            status: 'ok',
            cached: true,
            metadata: { extraPhotos: extras.length, hasVideo: Boolean(video), qualityGate: 'cache_hit' },
          });
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
              file_type: primary.mimetype,
              file_size: primary.size,
              extraPhotos: extras.length,
              extra_photos: extras.length,
              hasVideo: Boolean(video),
              has_video: Boolean(video),
              cached: true,
              cacheAgeSeconds: Math.round(cached.ageMs / 1000),
              cache_age_seconds: Math.round(cached.ageMs / 1000),
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

        const reserve = await reserveAiCredits({
          userId: req.user.id,
          feature: 'health_analysis',
          petId,
          details: { imageCount: quality.imageCount, hasVideo: quality.hasVideo },
          metadata: { extraPhotos: extras.length, hasVideo: Boolean(video), qualityGate: 'passed' },
        });
        if (!reserve.ok) {
          if (requestId) {
            setAnalysisProgress({
              requestId,
              userId: req.user.id,
              stage: 'failed',
              status: 'failed',
              message: reserve.error,
            });
          }
          return res.status(reserve.status ?? 402).json({
            error: reserve.error,
            code: reserve.code,
            creditBalance: reserve.creditBalance,
            creditCost: reserve.creditCost,
            featureTrialBalance: reserve.featureTrialBalance,
            feature: reserve.feature,
            monthlyResetAt: reserve.monthlyResetAt,
          });
        }
        creditReservation = attachReservationContext(reserve, { userId: req.user.id, feature: 'health_analysis', petId });
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
        const outputLocale = quality.outputLocale;
        const aiResult = await analyzePetHealthImages(imageFilesForModel, healthAppendix, outputLocale);
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
          imageUrl = await storeDiagnosisImage({ userId: req.user.id, petId, file: primary, accessToken: req.accessToken });
          for (const f of extras) {
            try {
              const url = await storeDiagnosisImage({ userId: req.user.id, petId, file: f, accessToken: req.accessToken });
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
            videoUrl = await storeDiagnosisVideo({ userId: req.user.id, petId, file: video, accessToken: req.accessToken });
          } catch (err) {
            console.warn('Diagnosis video upload failed:', err?.message ?? err);
            storageWarning = storageWarning ? `${storageWarning} Video not stored.` : 'Video upload failed. Diagnosis was still saved.';
          }
        }

        const weightRaw = typeof req.body.weightKg === 'string' ? req.body.weightKg.trim() : '';
        const weightNum = weightRaw === '' ? null : Number(weightRaw);
        const weightKg = Number.isFinite(weightNum) ? weightNum : null;
        const normOutLoc = typeof outputLocale === 'string' && outputLocale.toLowerCase().startsWith('vi') ? 'vi' : 'en';

        const inputContext = {
          weight_kg: weightKg,
          vaccination_status: req.body.vaccinated === 'yes' || req.body.vaccinated === 'no' ? req.body.vaccinated : null,
          vaccine_type: typeof req.body.vaccineType === 'string' && req.body.vaccineType.trim() ? req.body.vaccineType.trim() : null,
          neutering_status: req.body.neutered === 'yes' || req.body.neutered === 'no' ? req.body.neutered : null,
          medical_history:
            typeof req.body.medicalHistory === 'string' && req.body.medicalHistory.trim()
              ? req.body.medicalHistory.trim()
              : null,
          symptom_description:
            typeof req.body.symptomDescription === 'string' && req.body.symptomDescription.trim()
              ? req.body.symptomDescription.trim()
              : null,
        };

        const stored = await createAnalysisRecord({
          userId: req.user.id,
          petId,
          assessment: aiResult.assessment,
          diagnosis: aiResult.diagnosis,
          severity: aiResult.severity,
          symptoms: aiResult.symptoms,
          treatment: aiResult.treatment,
          confidence: aiResult.confidence,
          disclaimer: aiResult.disclaimer,
          outputLocale: normOutLoc,
          imageUrl,
          extraImageUrls,
          videoUrl,
          weightKg,
          vaccinationStatus: inputContext.vaccination_status,
          vaccineType: inputContext.vaccine_type,
          neuteringStatus: inputContext.neutering_status,
          medicalHistory: inputContext.medical_history,
          symptomDescription: inputContext.symptom_description,
        });

        markAnalysisCompleted(req.user.id, petId);
        void recordProductEvent({
          userId: req.user.id,
          petId,
          event: 'ai_health_scan_completed',
          metadata: { outputLocale: normOutLoc, status: aiResult.status },
        });
        await recordAiUsageEvent({
          userId: req.user.id,
          petId,
          feature: 'health_analysis',
          status: 'ok',
          reservation: creditReservation,
          estimate: creditReservation?.estimate,
          metadata: { extraPhotos: extras.length, hasVideo: Boolean(video), outputLocale: normOutLoc },
        });
        const enrichedData = {
          ...stored,
          assessment: aiResult.assessment ?? stored.assessment,
          status: aiResult.status,
          red_flags: aiResult.red_flags,
          diagnosis_candidates: aiResult.diagnosis_candidates,
          evidence: aiResult.evidence,
          missing_data: aiResult.missing_data,
          next_action: aiResult.next_action,
          media: {
            image_url: stored.image_url,
            extra_image_urls: stored.extra_image_urls ?? [],
            video_url: stored.video_url ?? null,
          },
          input_context: inputContext,
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
            file_type: primary.mimetype,
            file_size: primary.size,
            extraPhotos: extras.length,
            extra_photos: extras.length,
            hasVideo: Boolean(video),
            has_video: Boolean(video),
            cached: false,
            ...(requestId ? { requestId } : {}),
            ...(requestId ? { request_id: requestId } : {}),
          },
          warnings: storageWarning ? [storageWarning] : [],
        });
      } catch (err) {
        await refundAiCredits(creditReservation, 'ai_error_refund');
        if (creditReservation) {
          await recordAiUsageEvent({
            userId: req.user.id,
            petId: typeof req.body?.petId === 'string' ? req.body.petId : null,
            feature: 'health_analysis',
            status: 'failed',
            reservation: creditReservation,
            estimate: creditReservation.estimate,
            metadata: { reason: err?.message ?? 'analysis failed' },
          });
        }
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

  return router;
}

