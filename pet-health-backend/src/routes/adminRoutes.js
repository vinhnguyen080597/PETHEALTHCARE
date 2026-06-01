import { Router } from 'express';
import { getSupabaseAnonClient, getSupabaseServiceClient } from '../config/supabase.js';
import { adminUpdateAccountProfile, ensureAccountProfile, listAdminAccounts, normalizeUserRole } from '../repositories/accountRepository.js';
import {
  adminUpdateBreederProfileStatus,
  adminUpdatePetFeedPostStatus,
  adminUpdatePetFeedReportStatus,
  listAdminBreederProfiles,
  listAdminPetFeedPosts,
  listAdminPetFeedReports,
} from '../repositories/petFeedRepository.js';
import { sendTestAlertEmail } from '../services/errorNotifierService.js';
import { getAiOpsSummary } from '../services/aiEconomicsService.js';
import { getProductAnalyticsSummary } from '../services/productAnalyticsService.js';
import { authEmailFromIdentifier, compactText, looksLikeEmail } from '../services/authIdentifierService.js';
import { hasValidAdminSecret, requireAdminOrSecret } from '../middleware/auth.js';

const router = Router();

function cleanId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isAlreadyRegistered(error) {
  const text = [error?.message, String(error?.code ?? ''), String(error?.status ?? '')].filter(Boolean).join(' ');
  return /already|registered|exists/i.test(text);
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

router.get('/accounts', requireAdminOrSecret, async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const accounts = await listAdminAccounts(search);
    return res.json({ data: accounts });
  } catch (err) {
    return next(err);
  }
});

router.post('/accounts', requireAdminOrSecret, async (req, res, next) => {
  try {
    const { email, password, displayName, primaryRole } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required', code: 'MISSING_ACCOUNT_FIELDS' });
    const admin = getSupabaseServiceClient();
    if (!admin) return res.status(503).json({ error: 'Supabase service role is required', code: 'SERVICE_ROLE_REQUIRED' });
    const authEmail = authEmailFromIdentifier(email);
    const role = normalizeUserRole(primaryRole, 'sen');
    const name = compactText(displayName) || compactText(email);
    const metadata = {
      full_name: name,
      login_identifier: compactText(email),
      auth_mode: looksLikeEmail(compactText(email)) ? 'email' : 'free_text_identifier',
      primary_role: role,
      created_by_admin: true,
    };
    const created = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (created.error && !isAlreadyRegistered(created.error)) throw created.error;
    let user = created.data?.user ?? null;
    if (!user && created.error) {
      const anon = getSupabaseAnonClient();
      const signedIn = anon ? await anon.auth.signInWithPassword({ email: authEmail, password }) : null;
      if (signedIn?.error) throw signedIn.error;
      user = signedIn?.data?.user ?? null;
    }
    if (!user?.id) return res.status(409).json({ error: 'Account exists but could not be loaded', code: 'ACCOUNT_LOAD_FAILED' });
    const account = await ensureAccountProfile({
      userId: user.id,
      email: user.email,
      loginIdentifier: metadata.login_identifier,
      displayName: name,
      primaryRole: role,
      metadata: { auth_mode: metadata.auth_mode, created_by_admin: true },
    });
    return res.status(created.error ? 200 : 201).json({ data: account });
  } catch (err) {
    return next(err);
  }
});

router.put('/accounts/:userId', requireAdminOrSecret, async (req, res, next) => {
  try {
    const userId = cleanId(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'userId is required', code: 'MISSING_USER_ID' });
    const account = await adminUpdateAccountProfile(userId, req.body ?? {});
    if (!account) return res.status(404).json({ error: 'Account not found', code: 'ACCOUNT_NOT_FOUND' });
    return res.json({ data: account });
  } catch (err) {
    return next(err);
  }
});

router.get('/breeder-profiles', requireAdminOrSecret, async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const profiles = await listAdminBreederProfiles(status);
    return res.json({ data: profiles });
  } catch (err) {
    return next(err);
  }
});

router.put('/breeder-profiles/:userId/status', requireAdminOrSecret, async (req, res, next) => {
  try {
    const userId = cleanId(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'userId is required', code: 'MISSING_USER_ID' });
    const verificationStatus = req.body?.verificationStatus ?? req.body?.verification_status;
    const profile = await adminUpdateBreederProfileStatus(userId, verificationStatus);
    if (!profile) return res.status(404).json({ error: 'Breeder profile not found', code: 'BREEDER_PROFILE_NOT_FOUND' });
    if (profile.verification_status === 'verified') {
      await adminUpdateAccountProfile(userId, { primaryRole: 'breeder' });
    } else if (profile.verification_status === 'rejected' || profile.verification_status === 'suspended') {
      await adminUpdateAccountProfile(userId, { primaryRole: 'sen' });
    }
    return res.json({ data: profile });
  } catch (err) {
    return next(err);
  }
});

router.get('/pet-feed/posts', requireAdminOrSecret, async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending_review';
    const posts = await listAdminPetFeedPosts(status);
    return res.json({ data: posts });
  } catch (err) {
    return next(err);
  }
});

router.put('/pet-feed/posts/:postId/status', requireAdminOrSecret, async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    const post = await adminUpdatePetFeedPostStatus(postId, req.body?.status);
    if (!post) return res.status(404).json({ error: 'Pet feed post not found', code: 'PET_FEED_POST_NOT_FOUND' });
    return res.json({ data: post });
  } catch (err) {
    return next(err);
  }
});

router.get('/pet-feed/reports', requireAdminOrSecret, async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'open';
    const reports = await listAdminPetFeedReports(status);
    return res.json({ data: reports });
  } catch (err) {
    return next(err);
  }
});

router.put('/pet-feed/reports/:reportId/status', requireAdminOrSecret, async (req, res, next) => {
  try {
    const reportId = cleanId(req.params.reportId);
    if (!reportId) return res.status(400).json({ error: 'reportId is required', code: 'MISSING_REPORT_ID' });
    const report = await adminUpdatePetFeedReportStatus(reportId, req.body?.status);
    if (!report) return res.status(404).json({ error: 'Report not found', code: 'PET_FEED_REPORT_NOT_FOUND' });
    return res.json({ data: report });
  } catch (err) {
    return next(err);
  }
});

export default router;

