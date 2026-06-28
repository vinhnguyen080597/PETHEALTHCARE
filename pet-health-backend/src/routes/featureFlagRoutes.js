import { Router } from 'express';
import { getFeatureFlags } from '../repositories/featureFlagRepository.js';
import { requireUser } from '../middleware/auth.js';

const router = Router();

router.get('/', requireUser, async (req, res, next) => {
  try {
    const data = await getFeatureFlags();
    return res.json({ data });
  } catch (err) {
    return next(err);
  }
});

export default router;
