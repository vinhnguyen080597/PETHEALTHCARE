import { Router } from 'express';
import { getSupabaseServiceClient } from '../config/supabase.js';
import { adminUpdateAccountProfile, ensureAccountProfile, getAccountProfile, listAdminAccounts, normalizeUserRole } from '../repositories/accountRepository.js';
import { listAnalysesByPet } from '../repositories/analysisRepository.js';
import {
  createCoreCareRecord,
  deleteCoreCareRecord,
  getCoreCareRecordById,
  listCoreCareRecords,
  summarizeCoreCareRecords,
  updateCoreCareRecord,
} from '../repositories/coreCareRepository.js';
import {
  adminUpdateAnnouncementPost,
  adminUpdateBreederProfileStatus,
  adminUpdatePetFeedPostStatus,
  adminUpdatePetFeedReportStatus,
  getAdminBreederProfileByUserId,
  getAdminPetFeedPostById,
  getAdminPetFeedReportById,
  listAdminBreederProfiles,
  listAdminPetFeedPosts,
  listAdminPetFeedReports,
} from '../repositories/petFeedRepository.js';
import { createBreederVerificationNotification, createListingReviewNotification } from '../repositories/petFeedNotificationsRepository.js';
import { listAdminActionLogs, recordAdminAction } from '../repositories/adminActionLogRepository.js';
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

function adminActor(req) {
  return {
    actorUserId: req.user?.id || null,
    viaSecret: Boolean(req.adminViaSecret),
  };
}

function breederActionName(status) {
  const safe = String(status || '').toLowerCase();
  if (safe === 'verified') return 'breeder.verify';
  if (safe === 'rejected') return 'breeder.reject';
  if (safe === 'suspended') return 'breeder.suspend';
  return `breeder.${safe || 'update'}`;
}

function postActionName(status) {
  const safe = String(status || '').toLowerCase();
  if (safe === 'published') return 'post.approve';
  if (safe === 'archived') return 'post.archive';
  return `post.${safe || 'update'}`;
}

function reportActionName(status) {
  const safe = String(status || '').toLowerCase();
  if (safe === 'reviewed') return 'report.review';
  if (safe === 'dismissed') return 'report.dismiss';
  return `report.${safe || 'update'}`;
}

function petSnapshot(pet) {
  if (!pet) return {};
  return {
    id: pet.id ?? null,
    name: pet.name ?? null,
    species: pet.species ?? null,
    breed: pet.breed ?? null,
    age: pet.age ?? null,
    gender: pet.gender ?? null,
  };
}

function careRecordSnapshot(record) {
  if (!record) return {};
  return {
    id: record.id ?? null,
    pet_id: record.pet_id ?? null,
    type: record.type ?? null,
    title: record.title ?? null,
    status: record.status ?? null,
    due_at: record.due_at ?? null,
  };
}

function logAdminAction(req, payload) {
  const actor = adminActor(req);
  void recordAdminAction({
    ...actor,
    ...payload,
  }).catch(() => null);
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
    if ('farm_template_change' in body || 'farmTemplateChange' in body) {
      patch.farm_template_change = body.farm_template_change ?? body.farmTemplateChange;
    }
    const before = await getFeatureFlags();
    const updatedBy = req.user?.id ?? null;
    const data = await updateFeatureFlags(patch, updatedBy);
    const changedKeys = Object.keys(patch).filter((key) => before?.[key] !== data?.[key]);
    logAdminAction(req, {
      action: 'feature_flags.update',
      targetType: 'feature_flags',
      targetId: 'feature_flags',
      beforeState: before || {},
      afterState: data || {},
      metadata: { changed_keys: changedKeys, patch },
    });
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
    logAdminAction(req, {
      action: 'account.create',
      targetType: 'account',
      targetId: account?.user_id || user.id,
      targetUserId: account?.user_id || user.id,
      beforeState: {},
      afterState: {
        email: account?.email || user.email || null,
        login_identifier: account?.login_identifier || metadata.login_identifier || null,
        display_name: account?.display_name || name || null,
        primary_role: account?.primary_role || role,
        account_status: account?.account_status || 'active',
      },
      metadata: {
        created_new_auth_user: Boolean(created),
        auth_mode: metadata.auth_mode,
      },
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
    const before = await getAccountProfile(userId);
    const account = await adminUpdateAccountProfile(userId, req.body ?? {});
    if (!account) return res.status(404).json({ error: 'Account not found', code: 'ACCOUNT_NOT_FOUND' });
    logAdminAction(req, {
      action: 'account.update',
      targetType: 'account',
      targetId: account.user_id,
      targetUserId: account.user_id,
      beforeState: {
        primary_role: before?.primary_role || null,
        account_status: before?.account_status || null,
        display_name: before?.display_name || null,
      },
      afterState: {
        primary_role: account.primary_role || null,
        account_status: account.account_status || null,
        display_name: account.display_name || null,
      },
      metadata: {},
    });
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
    const rejectionReason = String(
      compactText(req.body?.rejectionReason ?? req.body?.rejection_reason ?? '') || '',
    ).slice(0, 500);
    const adminNote = String(
      compactText(req.body?.adminNote ?? req.body?.admin_note ?? '') || '',
    ).slice(0, 500);
    const adminAction = String(
      compactText(req.body?.adminAction ?? req.body?.admin_action ?? '') || '',
    ).slice(0, 300);

    if (String(verificationStatus || '').toLowerCase() === 'rejected' && !rejectionReason) {
      return res.status(400).json({
        error: 'rejectionReason is required when rejecting a breeder',
        code: 'MISSING_REJECTION_REASON',
      });
    }

    const before = await getAdminBreederProfileByUserId(userId);
    const profile = await adminUpdateBreederProfileStatus(userId, verificationStatus, {
      rejectionReason,
      adminNote,
      adminAction,
    });
    if (!profile) return res.status(404).json({ error: 'Breeder profile not found', code: 'BREEDER_PROFILE_NOT_FOUND' });
    if (profile.verification_status === 'verified') {
      await adminUpdateAccountProfile(userId, { primaryRole: 'breeder' });
      void createBreederVerificationNotification({
        recipientUserId: userId,
        actorUserId: req.user?.id || 'admin',
        breederProfileId: profile.id,
        type: 'breeder_verified',
        bodyPreview: 'Hồ sơ trại của bạn đã được Admin duyệt.',
        metadata: {
          cta_label: 'Xem hồ sơ trại',
          cta_href: `/app/breeders/${profile.id}`,
        },
        accessToken: req.accessToken,
      }).catch(() => null);
    } else if (profile.verification_status === 'rejected' || profile.verification_status === 'suspended') {
      await adminUpdateAccountProfile(userId, { primaryRole: 'sen' });
      if (profile.verification_status === 'rejected') {
        void createBreederVerificationNotification({
          recipientUserId: userId,
          actorUserId: req.user?.id || 'admin',
          breederProfileId: profile.id,
          type: 'breeder_rejected',
          bodyPreview: rejectionReason || 'Hồ sơ trại của bạn chưa được duyệt.',
          metadata: {
            cta_label: 'Xem lý do từ chối',
            cta_href: '/app/account/breeder',
            rejection_reason: rejectionReason,
            admin_note: adminNote || undefined,
            admin_action: adminAction || undefined,
          },
          accessToken: req.accessToken,
        }).catch(() => null);
      }
    }

    logAdminAction(req, {
      action: breederActionName(profile.verification_status),
      targetType: 'breeder_profile',
      targetId: profile.id,
      targetUserId: userId,
      beforeState: {
        verification_status: before?.verification_status || null,
        display_name: before?.display_name || null,
      },
      afterState: {
        verification_status: profile.verification_status,
        display_name: profile.display_name || null,
      },
      metadata: {
        rejection_reason: rejectionReason || undefined,
        admin_note: adminNote || undefined,
        admin_action: adminAction || undefined,
        role_side_effect:
          profile.verification_status === 'verified'
            ? 'breeder'
            : profile.verification_status === 'rejected' || profile.verification_status === 'suspended'
              ? 'sen'
              : undefined,
      },
    });

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
    const nextStatus = String(req.body?.status || '').toLowerCase();
    const rejectionReason = String(
      compactText(req.body?.rejectionReason ?? req.body?.rejection_reason ?? '') || '',
    ).slice(0, 500);
    const adminNote = String(
      compactText(req.body?.adminNote ?? req.body?.admin_note ?? '') || '',
    ).slice(0, 500);
    const adminAction = String(
      compactText(req.body?.adminAction ?? req.body?.admin_action ?? '') || '',
    ).slice(0, 300);

    const before = await getAdminPetFeedPostById(postId);
    const beforeStatus = String(before?.status || '').toLowerCase();
    if (nextStatus === 'archived' && beforeStatus === 'pending_review' && !rejectionReason) {
      return res.status(400).json({
        error: 'rejectionReason is required when rejecting a listing',
        code: 'MISSING_REJECTION_REASON',
      });
    }

    const post = await adminUpdatePetFeedPostStatus(postId, req.body?.status, {
      rejectionReason,
      adminNote,
      adminAction,
    });
    if (!post) return res.status(404).json({ error: 'Pet feed post not found', code: 'PET_FEED_POST_NOT_FOUND' });

    const resolvedStatus = String(post.status || '').toLowerCase();
    const recipientUserId = post.user_id || before?.user_id || null;
    const titlePreview = compactText(post.title || before?.title || '') || 'bài đăng';
    if (recipientUserId && beforeStatus !== resolvedStatus) {
      if (resolvedStatus === 'published') {
        void createListingReviewNotification({
          recipientUserId,
          actorUserId: req.user?.id || 'admin',
          postId: post.id,
          type: 'listing_approved',
          bodyPreview: `Bài đăng "${String(titlePreview).slice(0, 80)}" đã được Admin duyệt.`,
          metadata: {
            title: post.title || before?.title || '',
            breeder_profile_id: post.breeder_profile_id || before?.breeder_profile_id || undefined,
            cta_label: 'Xem bài đăng',
            cta_href: `/app/pet-feed/posts/${encodeURIComponent(post.id)}`,
          },
          accessToken: req.accessToken,
        }).catch(() => null);
      } else if (resolvedStatus === 'archived' && beforeStatus === 'pending_review') {
        void createListingReviewNotification({
          recipientUserId,
          actorUserId: req.user?.id || 'admin',
          postId: post.id,
          type: 'listing_rejected',
          bodyPreview: rejectionReason || `Bài đăng "${String(titlePreview).slice(0, 80)}" chưa được duyệt.`,
          metadata: {
            title: post.title || before?.title || '',
            breeder_profile_id: post.breeder_profile_id || before?.breeder_profile_id || undefined,
            rejection_reason: rejectionReason,
            admin_note: adminNote || undefined,
            admin_action: adminAction || undefined,
            cta_label: 'Xem tin đăng',
            cta_href: `/app/account`,
          },
          accessToken: req.accessToken,
        }).catch(() => null);
      }
    }

    logAdminAction(req, {
      action: postActionName(post.status),
      targetType: 'post',
      targetId: post.id,
      targetUserId: post.user_id || before?.user_id || null,
      beforeState: {
        status: before?.status || null,
        title: before?.title || null,
      },
      afterState: {
        status: post.status,
        title: post.title || null,
      },
      metadata: {
        breeder_profile_id: post.breeder_profile_id || before?.breeder_profile_id || null,
        rejection_reason: rejectionReason || undefined,
        admin_note: adminNote || undefined,
        admin_action: adminAction || undefined,
      },
    });
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
    const before = await getAdminPetFeedReportById(reportId);
    const report = await adminUpdatePetFeedReportStatus(reportId, req.body?.status);
    if (!report) return res.status(404).json({ error: 'Report not found', code: 'PET_FEED_REPORT_NOT_FOUND' });
    const reviewedNow = report.status === 'reviewed' && before?.status !== 'reviewed';
    logAdminAction(req, {
      action: reportActionName(report.status),
      targetType: 'report',
      targetId: report.id,
      targetUserId: report.user_id || before?.user_id || null,
      beforeState: {
        status: before?.status || null,
        reason: before?.reason || null,
        target_type: before?.target_type || null,
      },
      afterState: {
        status: report.status,
        reason: report.reason || null,
        target_type: report.target_type || null,
      },
      metadata: {
        post_id: report.post_id || before?.post_id || null,
        breeder_profile_id: report.breeder_profile_id || before?.breeder_profile_id || null,
        penalty_applied: reviewedNow,
      },
    });
    return res.json({ data: report });
  } catch (err) {
    return next(err);
  }
});

router.get('/action-logs', requireAdminOrSecret, async (req, res, next) => {
  try {
    const result = await listAdminActionLogs({
      action: typeof req.query.action === 'string' ? req.query.action : '',
      actorUserId: typeof req.query.actorUserId === 'string' ? req.query.actorUserId : req.query.actor_user_id,
      targetType: typeof req.query.targetType === 'string' ? req.query.targetType : req.query.target_type,
      targetId: typeof req.query.targetId === 'string' ? req.query.targetId : req.query.target_id,
      targetUserId: typeof req.query.targetUserId === 'string' ? req.query.targetUserId : req.query.target_user_id,
      from: typeof req.query.from === 'string' ? req.query.from : '',
      to: typeof req.query.to === 'string' ? req.query.to : '',
      cursor: typeof req.query.cursor === 'string' ? req.query.cursor : '',
      limit: req.query.limit,
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.put('/announcements/:postId', requireAdminOrSecret, async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    const before = await getAdminPetFeedPostById(postId);
    const post = await adminUpdateAnnouncementPost(postId, req.body ?? {});
    if (!post) return res.status(404).json({ error: 'Announcement not found', code: 'ANNOUNCEMENT_NOT_FOUND' });
    logAdminAction(req, {
      action: 'announcement.update',
      targetType: 'announcement',
      targetId: post.id,
      targetUserId: post.user_id || before?.user_id || null,
      beforeState: {
        title: before?.title || null,
        status: before?.status || null,
        description: before?.description || null,
        category: before?.metadata?.category || null,
      },
      afterState: {
        title: post.title || null,
        status: post.status || null,
        description: post.description || null,
        category: post.metadata?.category || null,
      },
      metadata: {},
    });
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
    logAdminAction(req, {
      action: 'pet.create',
      targetType: 'pet',
      targetId: created?.id || null,
      targetUserId: userId,
      beforeState: {},
      afterState: petSnapshot(created),
      metadata: {
        owner_email: account.email || null,
        owner_display_name: account.display_name || null,
      },
    });
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
    logAdminAction(req, {
      action: 'pet.update',
      targetType: 'pet',
      targetId: petId,
      targetUserId: userId,
      beforeState: petSnapshot(pet),
      afterState: petSnapshot(updated),
      metadata: {
        owner_email: account.email || null,
        owner_display_name: account.display_name || null,
      },
    });
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
    logAdminAction(req, {
      action: 'care_record.create',
      targetType: 'care_record',
      targetId: record?.id || null,
      targetUserId: userId,
      beforeState: {},
      afterState: careRecordSnapshot(record),
      metadata: {
        pet_id: petId,
        pet_name: pet.name || null,
        owner_email: account.email || null,
      },
    });
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
    const before = await getCoreCareRecordById(userId, recordId, null);
    const record = await updateCoreCareRecord(userId, recordId, req.body ?? {}, null);
    if (!record) return res.status(404).json({ error: 'Record not found', code: 'CORE_CARE_RECORD_NOT_FOUND' });
    logAdminAction(req, {
      action: 'care_record.update',
      targetType: 'care_record',
      targetId: recordId,
      targetUserId: userId,
      beforeState: careRecordSnapshot(before),
      afterState: careRecordSnapshot(record),
      metadata: {
        pet_id: record.pet_id || before?.pet_id || null,
        owner_email: account.email || null,
      },
    });
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
    const before = await getCoreCareRecordById(userId, recordId, null);
    const ok = await deleteCoreCareRecord(userId, recordId, null);
    if (!ok) return res.status(404).json({ error: 'Record not found', code: 'CORE_CARE_RECORD_NOT_FOUND' });
    logAdminAction(req, {
      action: 'care_record.delete',
      targetType: 'care_record',
      targetId: recordId,
      targetUserId: userId,
      beforeState: careRecordSnapshot(before),
      afterState: {},
      metadata: {
        pet_id: before?.pet_id || null,
        owner_email: account.email || null,
      },
    });
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
    const limit = req.query.limit;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
    const view = typeof req.query.view === 'string' ? req.query.view : 'list';
    const page = await listAnalysesByPet(userId, petId, {
      displayLocale,
      limit,
      cursor,
      view,
    });
    return res.json(page);
  } catch (err) {
    return next(err);
  }
});

export default router;

