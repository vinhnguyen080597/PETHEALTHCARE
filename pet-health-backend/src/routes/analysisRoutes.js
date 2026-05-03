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

const router = Router();

/** Primary image 5MB; extras same; video up to 10MB (≈10s). Multer cap above any single file. */
const analysisUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

router.use(requireUser);

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
    try {
      const { petId } = req.body;
      if (!petId) {
        return res.status(400).json({ error: 'petId is required' });
      }

      const pet = await getPetByIdForUser(req.user.id, petId, req.accessToken);
      if (!pet) {
        return res.status(404).json({ error: 'Pet not found' });
      }

      const primary = req.files?.image?.[0];
      const extras = Array.isArray(req.files?.photos) ? req.files.photos : [];
      const video = req.files?.video?.[0];

      if (!primary) {
        return res.status(400).json({ error: 'image file is required (field name: image)' });
      }

      validateImageFile(primary);
      for (const f of extras) {
        validateImageFile(f);
      }
      if (video) {
        validateVideoFile(video);
      }

      const imageFilesForModel = [primary, ...extras];
      const healthAppendix = buildHealthContextAppendix(req.body);
      const aiResult = await analyzePetHealthImages(imageFilesForModel, healthAppendix);

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

      return res.json({
        data: stored,
        metadata: {
          fileType: primary.mimetype,
          fileSize: primary.size,
          extraPhotos: extras.length,
          hasVideo: Boolean(video),
        },
        warnings: storageWarning ? [storageWarning] : [],
      });
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
