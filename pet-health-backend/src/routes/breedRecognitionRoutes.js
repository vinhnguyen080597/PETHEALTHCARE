import { Router } from 'express';
import multer from 'multer';
import { requireUser } from '../middleware/auth.js';
import { getPetByIdForUser } from '../repositories/petRepository.js';
import { analyzeCatBreedFromLabeledImages } from '../services/catBreedRecognitionService.js';
import { validateImageFile } from '../services/aiDiagnosisService.js';

const SLOT_ORDER = ['face', 'eyes', 'pawPads', 'coat', 'fullBodySun', 'parentPedigree'];
const REQUIRED_SLOTS = ['face', 'eyes', 'coat'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();
router.use(requireUser);

router.post(
  '/',
  upload.fields(SLOT_ORDER.map((name) => ({ name, maxCount: 1 }))),
  async (req, res, next) => {
    try {
      const petId = typeof req.body?.petId === 'string' ? req.body.petId.trim() : '';
      if (!petId) {
        return res.status(400).json({ error: 'petId is required', code: 'MISSING_PET_ID' });
      }

      const pet = await getPetByIdForUser(req.user.id, petId, req.accessToken);
      if (!pet) {
        return res.status(404).json({ error: 'Pet not found', code: 'PET_NOT_FOUND' });
      }
      if (String(pet.species || '').toLowerCase() !== 'cat') {
        return res.status(400).json({
          error: 'Breed recognition is only available for cats',
          code: 'SPECIES_NOT_CAT',
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

      const locale = typeof req.body?.locale === 'string' ? req.body.locale : 'en';
      const data = await analyzeCatBreedFromLabeledImages(ordered, locale);
      return res.json({ data });
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
