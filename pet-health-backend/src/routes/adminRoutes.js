import { Router } from 'express';
import { sendTestAlertEmail } from '../services/errorNotifierService.js';
import { getAiOpsSummary } from '../services/aiEconomicsService.js';
import { getProductAnalyticsSummary } from '../services/productAnalyticsService.js';

const router = Router();

function hasValidAdminSecret(req) {
  const expected = String(process.env.ADMIN_INTERNAL_API_KEY || '').trim();
  if (!expected) return false;
  const provided = String(req.headers['x-admin-secret'] || '').trim();
  return provided.length > 0 && provided === expected;
}

router.post('/test-alert-email', async (req, res, next) => {
  try {
    if (!hasValidAdminSecret(req)) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED_ADMIN',
      });
    }
    const messageId = await sendTestAlertEmail({ source: 'admin-endpoint' });
    return res.json({
      data: { ok: true, messageId },
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/ai-ops-summary', async (req, res, next) => {
  try {
    if (!hasValidAdminSecret(req)) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED_ADMIN',
      });
    }
    const data = await getAiOpsSummary();
    return res.json({ data });
  } catch (err) {
    return next(err);
  }
});

router.get('/product-analytics-summary', async (req, res, next) => {
  try {
    if (!hasValidAdminSecret(req)) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED_ADMIN',
      });
    }
    const data = await getProductAnalyticsSummary();
    return res.json({ data });
  } catch (err) {
    return next(err);
  }
});

export default router;

