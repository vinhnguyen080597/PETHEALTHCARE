import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import {
  createPetForUser,
  deletePetForUser,
  getPetByIdForUser,
  listPetsByUser,
  updatePetForUser,
} from '../repositories/petRepository.js';

const router = Router();

router.use(requireUser);

router.get('/', async (req, res, next) => {
  try {
    const data = await listPetsByUser(req.user.id);
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

    const created = await createPetForUser(req.user.id, req.body);
    return res.status(201).json({ data: created });
  } catch (err) {
    return next(err);
  }
});

router.get('/:petId', async (req, res, next) => {
  try {
    const pet = await getPetByIdForUser(req.user.id, req.params.petId);
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
    const updated = await updatePetForUser(req.user.id, req.params.petId, req.body);
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
    const deleted = await deletePetForUser(req.user.id, req.params.petId);
    if (!deleted) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
