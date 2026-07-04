import { Router } from 'express';
import { getSupabaseServiceClient } from '../config/supabase.js';
import { adminUpdateAccountProfile, ensureAccountProfile, getAccountProfile, listAdminAccounts, normalizeUserRole } from '../repositories/accountRepository.js';
import { listAnalysesByPet } from '../repositories/analysisRepository.js';
import {
  createCoreCareRecord,
  deleteCoreCareRecord,
  listCoreCareRecords,
  summarizeCoreCareRecords,
  updateCoreCareRecord,
} from '../repositories/coreCareRepository.js';
import {
  adminUpdateAnnouncementPost,
  adminUpdateBreederProfileStatus,
  adminUpdatePetFeedPostStatus,
  adminUpdatePetFeedReportStatus,
  listAdminBreederProfiles,
  listAdminPetFeedPosts,
  listAdminPetFeedReports,
} from '../repositories/petFeedRepository.js';
import { createPetForUser, getPetByIdForUser, listPetsByUser, updatePetForUser } from '../repositories/petRepository.js';
import { sendTestAlertEmail } from '../services/errorNotifierService.js';
import { getAiOpsSummary } from '../services/aiEconomicsService.js';
import { getProductAnalyticsSummary } from '../services/productAnalyticsService.js';
import { authEmailFromIdentifier, compactText, looksLikeEmail } from '../services/authIdentifierService.js';
import { resolveAdminCreatedAuthUser, validateAdminAccountPassword } from '../services/adminAuthUserService.js';
import { hasValidAdminSecret, requireAdminOrSecret } from '../middleware/auth.js';
import { getFeatureFlags, updateFeatureFlags } from '../repositories/featureFlagRepository.js';

const router = Router();

function cleanId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function requireManagedAccount(userId, res) {
  const account = await getAccountProfile(userId);
  if (!account) {
    res.status(404).json({ error: 'Account not found', code: 'ACCOUNT_NOT_FOUND' });
    return null;
  }
  return account;
}

async function requireManagedPet(userId, petId, res) {
  const pet = await getPetByIdForUser(userId, petId, null);
  if (!pet) {
    res.status(404).json({ error: 'Pet not found', code: 'PET_NOT_FOUND' });
    return null;
  }
  return pet;
}

router.post('/test-alert-email', async (req, res, next) => {
  try {
    if (process.env.ALLOW_ADMIN_TEST_ALERT_EMAIL !== 'true') {
      return res.status(404).json({
        error: 'Not found',
        code: 'ADMIN_TEST_ALERT_DISABLED',
      });
    }
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

router.get('/feature-flags', requireAdminOrSecret, async (req, res, next) => {
  try {
    const data = await getFeatureFlags();
    return res.json({ data });
  } catch (err) {
    return next(err);
  }
});

router.put('/feature-flags', requireAdminOrSecret, async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const patch = {};
    if ('breed_recognition' in body || 'breedRecognition' in body) {
      patch.breed_recognition = body.breed_recognition ?? body.breedRecognition;
    }
    if ('health_analysis' in body || 'healthAnalysis' in body) {
      patch.health_analysis = body.health_analysis ?? body.healthAnalysis;
    }
    if ('rewarded_ads' in body || 'rewardedAds' in body) {
      patch.rewarded_ads = body.rewarded_ads ?? body.rewardedAds;
    }
    if ('subscription' in body) {
      patch.subscription = body.subscription;
    }
    if ('pet_feed_news' in body || 'petFeedNews' in body) {
      patch.pet_feed_news = body.pet_feed_news ?? body.petFeedNews;
    }
    if ('pet_feed_listings' in body || 'petFeedListings' in body) {
      patch.pet_feed_listings = body.pet_feed_listings ?? body.petFeedListings;
    }
    if ('pet_feed_breeders' in body || 'petFeedBreeders' in body) {
      patch.pet_feed_breeders = body.pet_feed_breeders ?? body.petFeedBreeders;
    }
    const updatedBy = req.user?.id ?? null;
    const data = await updateFeatureFlags(patch, updatedBy);
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
    validateAdminAccountPassword(password);
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
    const { user, created } = await resolveAdminCreatedAuthUser(admin, { authEmail, password, metadata });
    if (!user?.id) return res.status(409).json({ error: 'Account could not be created', code: 'ACCOUNT_LOAD_FAILED' });
    const account = await ensureAccountProfile({
      userId: user.id,
      email: user.email,
      loginIdentifier: metadata.login_identifier,
      displayName: name,
      primaryRole: role,
      metadata: { auth_mode: metadata.auth_mode, created_by_admin: true },
      allowPrivilegedRole: true,
    });
    return res.status(created ? 201 : 200).json({ data: account });
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

router.put('/announcements/:postId', requireAdminOrSecret, async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    const post = await adminUpdateAnnouncementPost(postId, req.body ?? {});
    if (!post) return res.status(404).json({ error: 'Announcement not found', code: 'ANNOUNCEMENT_NOT_FOUND' });
    return res.json({ data: post });
  } catch (err) {
    return next(err);
  }
});

router.get('/users/:userId/pets', requireAdminOrSecret, async (req, res, next) => {
  try {
    const userId = cleanId(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'userId is required', code: 'MISSING_USER_ID' });
    const account = await requireManagedAccount(userId, res);
    if (!account) return;
    const pets = await listPetsByUser(userId, null);
    return res.json({ data: pets });
  } catch (err) {
    return next(err);
  }
});

router.post('/users/:userId/pets', requireAdminOrSecret, async (req, res, next) => {
  try {
    const userId = cleanId(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'userId is required', code: 'MISSING_USER_ID' });
    const account = await requireManagedAccount(userId, res);
    if (!account) return;
    const created = await createPetForUser(userId, req.body ?? {}, null);
    return res.status(201).json({ data: created });
  } catch (err) {
    return next(err);
  }
});

router.put('/users/:userId/pets/:petId', requireAdminOrSecret, async (req, res, next) => {
  try {
    const userId = cleanId(req.params.userId);
    const petId = cleanId(req.params.petId);
    if (!userId || !petId) return res.status(400).json({ error: 'userId and petId are required', code: 'MISSING_PET_FIELDS' });
    const account = await requireManagedAccount(userId, res);
    if (!account) return;
    const pet = await requireManagedPet(userId, petId, res);
    if (!pet) return;
    const updated = await updatePetForUser(userId, petId, req.body ?? {}, null);
    return res.json({ data: updated });
  } catch (err) {
    return next(err);
  }
});

router.get('/users/:userId/pets/:petId/care-records', requireAdminOrSecret, async (req, res, next) => {
  try {
    const userId = cleanId(req.params.userId);
    const petId = cleanId(req.params.petId);
    if (!userId || !petId) return res.status(400).json({ error: 'userId and petId are required', code: 'MISSING_PET_FIELDS' });
    const account = await requireManagedAccount(userId, res);
    if (!account) return;
    const pet = await requireManagedPet(userId, petId, res);
    if (!pet) return;
    const type = typeof req.query.type === 'string' ? req.query.type : null;
    const records = await listCoreCareRecords(userId, petId, null, { type });
    return res.json({ data: records, summary: summarizeCoreCareRecords(records) });
  } catch (err) {
    return next(err);
  }
});

router.post('/users/:userId/pets/:petId/care-records', requireAdminOrSecret, async (req, res, next) => {
  try {
    const userId = cleanId(req.params.userId);
    const petId = cleanId(req.params.petId);
    if (!userId || !petId) return res.status(400).json({ error: 'userId and petId are required', code: 'MISSING_PET_FIELDS' });
    const account = await requireManagedAccount(userId, res);
    if (!account) return;
    const pet = await requireManagedPet(userId, petId, res);
    if (!pet) return;
    const record = await createCoreCareRecord(userId, petId, req.body ?? {}, null);
    return res.status(201).json({ data: record });
  } catch (err) {
    return next(err);
  }
});

router.put('/users/:userId/care-records/:recordId', requireAdminOrSecret, async (req, res, next) => {
  try {
    const userId = cleanId(req.params.userId);
    const recordId = cleanId(req.params.recordId);
    if (!userId || !recordId) return res.status(400).json({ error: 'userId and recordId are required', code: 'MISSING_RECORD_FIELDS' });
    const account = await requireManagedAccount(userId, res);
    if (!account) return;
    const record = await updateCoreCareRecord(userId, recordId, req.body ?? {}, null);
    if (!record) return res.status(404).json({ error: 'Record not found', code: 'CORE_CARE_RECORD_NOT_FOUND' });
    return res.json({ data: record });
  } catch (err) {
    return next(err);
  }
});

router.delete('/users/:userId/care-records/:recordId', requireAdminOrSecret, async (req, res, next) => {
  try {
    const userId = cleanId(req.params.userId);
    const recordId = cleanId(req.params.recordId);
    if (!userId || !recordId) return res.status(400).json({ error: 'userId and recordId are required', code: 'MISSING_RECORD_FIELDS' });
    const account = await requireManagedAccount(userId, res);
    if (!account) return;
    const ok = await deleteCoreCareRecord(userId, recordId, null);
    if (!ok) return res.status(404).json({ error: 'Record not found', code: 'CORE_CARE_RECORD_NOT_FOUND' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

router.get('/users/:userId/pets/:petId/analyses', requireAdminOrSecret, async (req, res, next) => {
  try {
    const userId = cleanId(req.params.userId);
    const petId = cleanId(req.params.petId);
    if (!userId || !petId) return res.status(400).json({ error: 'userId and petId are required', code: 'MISSING_PET_FIELDS' });
    const account = await requireManagedAccount(userId, res);
    if (!account) return;
    const pet = await requireManagedPet(userId, petId, res);
    if (!pet) return;
    const displayLocale = typeof req.query.displayLocale === 'string' ? req.query.displayLocale : null;
    const analyses = await listAnalysesByPet(userId, petId, displayLocale);
    return res.json({ data: analyses });
  } catch (err) {
    return next(err);
  }
});

export default router;

