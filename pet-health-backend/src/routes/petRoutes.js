import { Router } from 'express';
import multer from 'multer';
import { requireUser } from '../middleware/auth.js';
import {
  createPetForUser,
  deletePetForUser,
  getPetByIdForUser,
  listPetsByUser,
  updatePetForUser,
} from '../repositories/petRepository.js';
import { storePetAvatar } from '../services/imageStorageService.js';
import { recordProductEvent } from '../services/productAnalyticsService.js';

const router = Router();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(requireUser);

router.post('/upload-avatar', avatarUpload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'image file is required (field name: image)' });
    }
    const avatarUrl = await storePetAvatar({ userId: req.user.id, file: req.file, accessToken: req.accessToken });
    return res.json({ data: { avatarUrl } });
  } catch (err) {
    return next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const data = await listPetsByUser(req.user.id, req.accessToken);
    return res.json({ data });
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, species } = req.body;
    if (!name || !species) {
      return res.status(400).json({ error: 'name and species are required' });
    }

    const created = await createPetForUser(req.user.id, req.body, req.accessToken);
    void recordProductEvent({
      userId: req.user.id,
      petId: created.id,
      event: 'pet_created',
      metadata: { species: created.species },
    });
    return res.status(201).json({ data: created });
  } catch (err) {
    return next(err);
  }
});

router.get('/:petId', async (req, res, next) => {
  try {
    const pet = await getPetByIdForUser(req.user.id, req.params.petId, req.accessToken);
    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    return res.json({ data: pet });
  } catch (err) {
    return next(err);
  }
});

router.put('/:petId', async (req, res, next) => {
  try {
    const updated = await updatePetForUser(req.user.id, req.params.petId, req.body, req.accessToken);
    if (!updated) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    return res.json({ data: updated });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:petId', async (req, res, next) => {
  try {
    const deleted = await deletePetForUser(req.user.id, req.params.petId, req.accessToken);
    if (!deleted) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
