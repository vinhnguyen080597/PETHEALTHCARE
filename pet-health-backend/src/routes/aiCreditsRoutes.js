import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getAiCreditSummary, getAiEconomicsConfig } from '../services/aiEconomicsService.js';

const router = Router();
router.use(requireUser);

router.get('/summary', async (req, res, next) => {
  try {
    const account = await getAiCreditSummary(req.user.id);
    return res.json({
      data: {
        account,
        config: getAiEconomicsConfig(),
      },
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
