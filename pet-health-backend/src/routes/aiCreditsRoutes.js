import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import {
  claimRewardedAdCredits,
  getAiCreditSummary,
  getAiEconomicsConfig,
  listAiCreditLedger,
} from '../services/aiEconomicsService.js';
import { recordProductEvent } from '../services/productAnalyticsService.js';

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

router.get('/ledger', async (req, res, next) => {
  try {
    const limit = req.query.limit;
    const data = await listAiCreditLedger(req.user.id, { limit });
    return res.json({ data });
  } catch (err) {
    return next(err);
  }
});

router.post('/rewarded-ad', async (req, res, next) => {
  try {
    const result = await claimRewardedAdCredits(req.user.id);
    if (!result.ok) {
      return res.status(result.status ?? 429).json({
        error: result.error,
        code: result.code,
        dailyCap: result.dailyCap,
      });
    }
    void recordProductEvent({
      userId: req.user.id,
      event: 'rewarded_ad_credit_claimed',
      metadata: { grantedCredits: result.grantedCredits, remainingToday: result.remainingToday },
    });
    return res.json({ data: result });
  } catch (err) {
    return next(err);
  }
});

export default router;
