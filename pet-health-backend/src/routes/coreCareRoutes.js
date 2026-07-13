import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getPetByIdForUser } from '../repositories/petRepository.js';
import {
  createCoreCareRecord,
  deleteCoreCareRecord,
  listCoreCareRecords,
  listVaccinationDueCountsByUser,
  summarizeCoreCareRecords,
  updateCoreCareRecord,
} from '../repositories/coreCareRepository.js';
import { recordProductEvent } from '../services/productAnalyticsService.js';

const router = Router();
router.use(requireUser);

async function requireOwnedPet(req, res) {
  const petId = typeof req.params.petId === 'string' ? req.params.petId.trim() : '';
  if (!petId) {
    res.status(400).json({ error: 'petId is required', code: 'MISSING_PET_ID' });
    return null;
  }
  const pet = await getPetByIdForUser(req.user.id, petId, req.accessToken);
  if (!pet) {
    res.status(404).json({ error: 'Pet not found', code: 'PET_NOT_FOUND' });
    return null;
  }
  return pet;
}

router.get('/vaccination-due-summary', async (req, res, next) => {
  try {
    const counts = await listVaccinationDueCountsByUser(req.user.id, req.accessToken);
    return res.json({ data: counts });
  } catch (err) {
    return next(err);
  }
});

router.get('/pets/:petId/records', async (req, res, next) => {
  try {
    const pet = await requireOwnedPet(req, res);
    if (!pet) return;
    const type = typeof req.query.type === 'string' ? req.query.type : null;
    const records = await listCoreCareRecords(req.user.id, pet.id, req.accessToken, { type });
    return res.json({ data: records, summary: summarizeCoreCareRecords(records) });
  } catch (err) {
    return next(err);
  }
});

router.post('/pets/:petId/records', async (req, res, next) => {
  try {
    const pet = await requireOwnedPet(req, res);
    if (!pet) return;
    const record = await createCoreCareRecord(req.user.id, pet.id, req.body ?? {}, req.accessToken);
    void recordProductEvent({
      userId: req.user.id,
      petId: pet.id,
      event: `core_care_${record.type}_created`,
      metadata: { status: record.status, hasDueDate: Boolean(record.due_at) },
    });
    return res.status(201).json({ data: record });
  } catch (err) {
    return next(err);
  }
});

router.put('/records/:recordId', async (req, res, next) => {
  try {
    const recordId = typeof req.params.recordId === 'string' ? req.params.recordId.trim() : '';
    if (!recordId) return res.status(400).json({ error: 'recordId is required', code: 'MISSING_RECORD_ID' });
    const record = await updateCoreCareRecord(req.user.id, recordId, req.body ?? {}, req.accessToken);
    if (!record) return res.status(404).json({ error: 'Record not found', code: 'CORE_CARE_RECORD_NOT_FOUND' });
    return res.json({ data: record });
  } catch (err) {
    return next(err);
  }
});

router.delete('/records/:recordId', async (req, res, next) => {
  try {
    const recordId = typeof req.params.recordId === 'string' ? req.params.recordId.trim() : '';
    if (!recordId) return res.status(400).json({ error: 'recordId is required', code: 'MISSING_RECORD_ID' });
    const ok = await deleteCoreCareRecord(req.user.id, recordId, req.accessToken);
    if (!ok) return res.status(404).json({ error: 'Record not found', code: 'CORE_CARE_RECORD_NOT_FOUND' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
