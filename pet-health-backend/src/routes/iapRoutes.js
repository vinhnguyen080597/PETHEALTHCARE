import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getIapPublicCatalog, restorePurchases, verifyAndFulfillPurchase } from '../services/iapService.js';

const router = Router();
router.use(requireUser);

router.get('/catalog', (_req, res) => {
  return res.json({ data: getIapPublicCatalog() });
});

router.post('/verify', async (req, res, next) => {
  try {
    const result = await verifyAndFulfillPurchase(req.user.id, req.body ?? {});
    if (!result.ok) {
      return res.status(result.status ?? 400).json({
        error: result.error,
        code: result.code,
      });
    }
    return res.json({ data: result });
  } catch (err) {
    return next(err);
  }
});

router.post('/restore', async (req, res, next) => {
  try {
    const purchases = Array.isArray(req.body?.purchases) ? req.body.purchases : [];
    const data = await restorePurchases(req.user.id, purchases);
    return res.json({ data });
  } catch (err) {
    return next(err);
  }
});

export default router;
