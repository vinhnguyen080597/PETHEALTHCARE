import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import {
  createSupportTicket,
  lookupSupportBlacklist,
  normalizeLookupQuery,
} from '../repositories/supportTicketsRepository.js';
import { createAdminRequestNotifications } from '../repositories/petFeedNotificationsRepository.js';

const router = Router();

/** Public demo + reviewed-scam lookup (no PII beyond what the caller searched). */
router.get('/blacklist', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    if (normalizeLookupQuery(q).length < 6) {
      return res.json({
        data: { hit: false, source: null, too_short: true },
      });
    }
    const result = await lookupSupportBlacklist(q);
    return res.json({ data: result });
  } catch (err) {
    return next(err);
  }
});

router.use(requireUser);

router.post('/tickets', async (req, res, next) => {
  try {
    const ticket = await createSupportTicket(req.user.id, req.body ?? {}, req.accessToken);
    const isFeedback = ticket.kind === 'feedback';
    const notifyType = isFeedback ? 'admin_feedback_open' : 'admin_scam_open';
    const preview = isFeedback
      ? `Góp ý mới (${ticket.category || 'other'}): ${ticket.title || ''}`.trim()
      : `Báo cáo lừa đảo mới (${ticket.scam_target_type || 'other'}).`;
    void createAdminRequestNotifications({
      actorUserId: req.user.id,
      type: notifyType,
      bodyPreview: preview,
      metadata: {
        title: isFeedback ? 'Góp ý Support Hub' : 'Báo cáo scam Support Hub',
        ticket_id: ticket.id,
        kind: ticket.kind,
        category: ticket.category,
        scam_target_type: ticket.scam_target_type,
      },
      accessToken: req.accessToken,
    }).catch(() => null);
    return res.status(201).json({ data: ticket });
  } catch (err) {
    if (err?.status) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    return next(err);
  }
});

export default router;
