import { Router } from 'express';
import multer from 'multer';
import { requireUser } from '../middleware/auth.js';
import { analyzePetImage } from '../services/aiDiagnosisService.js';
import { createAnalysisRecord, listAnalysesByPet } from '../repositories/analysisRepository.js';
import { getPetByIdForUser } from '../repositories/petRepository.js';
import { storeDiagnosisImage } from '../services/imageStorageService.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
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

router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const { petId } = req.body;
    if (!petId) {
      return res.status(400).json({ error: 'petId is required' });
    }
    const pet = await getPetByIdForUser(req.user.id, petId);
    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    const aiResult = await analyzePetImage(req.file);
    let imageUrl = null;
    let storageWarning = null;
    try {
      imageUrl = await storeDiagnosisImage({ userId: req.user.id, petId, file: req.file });
    } catch (err) {
      console.warn('Diagnosis image upload failed:', err?.message ?? err);
      storageWarning = 'Image upload failed. Diagnosis was saved without image.';
    }

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
    });

    return res.json({
      data: stored,
      metadata: {
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      },
      warnings: storageWarning ? [storageWarning] : [],
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
