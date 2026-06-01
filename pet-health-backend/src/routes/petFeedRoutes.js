import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import {
  adminUpdatePetFeedPostStatus,
  createPetFeedPost,
  favoritePetFeedPost,
  getMyBreederProfile,
  getPetFeedPost,
  listAdminPetFeedPosts,
  listAdminPetFeedReports,
  listFavoritePetFeedPosts,
  listMyPetFeedPosts,
  listPublishedPetFeedPosts,
  reportPetFeedPost,
  unfavoritePetFeedPost,
  updatePetFeedPost,
  upsertMyBreederProfile,
} from '../repositories/petFeedRepository.js';
import { recordProductEvent } from '../services/productAnalyticsService.js';

const router = Router();
router.use(requireUser);

function cleanId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function hasValidAdminSecret(req) {
  const expected = String(process.env.ADMIN_INTERNAL_API_KEY || '').trim();
  if (!expected) return false;
  const provided = String(req.headers['x-admin-secret'] || '').trim();
  return provided.length > 0 && provided === expected;
}

function requireAdminSecret(req, res) {
  if (hasValidAdminSecret(req)) return true;
  res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED_ADMIN' });
  return false;
}

router.get('/posts', async (req, res, next) => {
  try {
    const posts = await listPublishedPetFeedPosts(req.user.id, req.accessToken);
    return res.json({ data: posts });
  } catch (err) {
    return next(err);
  }
});

router.get('/posts/:postId', async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    const post = await getPetFeedPost(req.user.id, postId, req.accessToken);
    if (!post) return res.status(404).json({ error: 'Pet feed post not found', code: 'PET_FEED_POST_NOT_FOUND' });
    return res.json({ data: post });
  } catch (err) {
    return next(err);
  }
});

router.post('/posts', async (req, res, next) => {
  try {
    const post = await createPetFeedPost(req.user.id, req.body ?? {}, req.accessToken);
    void recordProductEvent({
      userId: req.user.id,
      event: 'pet_feed_post_created',
      metadata: { status: post.status, species: post.species, breed: post.breed },
    });
    return res.status(201).json({ data: post });
  } catch (err) {
    return next(err);
  }
});

router.get('/my-posts', async (req, res, next) => {
  try {
    const posts = await listMyPetFeedPosts(req.user.id, req.accessToken);
    return res.json({ data: posts });
  } catch (err) {
    return next(err);
  }
});

router.put('/posts/:postId', async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    const post = await updatePetFeedPost(req.user.id, postId, req.body ?? {}, req.accessToken);
    if (!post) return res.status(404).json({ error: 'Pet feed post not found', code: 'PET_FEED_POST_NOT_FOUND' });
    return res.json({ data: post });
  } catch (err) {
    return next(err);
  }
});

router.post('/posts/:postId/favorite', async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    await favoritePetFeedPost(req.user.id, postId, req.accessToken);
    void recordProductEvent({ userId: req.user.id, event: 'pet_feed_post_favorited', metadata: { postId } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

router.post('/posts/:postId/report', async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    const report = await reportPetFeedPost(req.user.id, postId, req.body ?? {}, req.accessToken);
    void recordProductEvent({ userId: req.user.id, event: 'pet_feed_post_reported', metadata: { postId, reason: report.reason } });
    return res.status(201).json({ data: report });
  } catch (err) {
    return next(err);
  }
});

router.delete('/posts/:postId/favorite', async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    await unfavoritePetFeedPost(req.user.id, postId, req.accessToken);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

router.get('/favorites', async (req, res, next) => {
  try {
    const posts = await listFavoritePetFeedPosts(req.user.id, req.accessToken);
    return res.json({ data: posts });
  } catch (err) {
    return next(err);
  }
});

router.get('/breeder-profile/me', async (req, res, next) => {
  try {
    const profile = await getMyBreederProfile(req.user.id, req.accessToken);
    return res.json({ data: profile });
  } catch (err) {
    return next(err);
  }
});

router.put('/breeder-profile/me', async (req, res, next) => {
  try {
    const profile = await upsertMyBreederProfile(req.user.id, req.body ?? {}, req.accessToken);
    void recordProductEvent({ userId: req.user.id, event: 'breeder_profile_upserted', metadata: { status: profile.verification_status } });
    return res.json({ data: profile });
  } catch (err) {
    return next(err);
  }
});

router.get('/admin/posts', async (req, res, next) => {
  try {
    if (!requireAdminSecret(req, res)) return;
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending_review';
    const posts = await listAdminPetFeedPosts(status);
    return res.json({ data: posts });
  } catch (err) {
    return next(err);
  }
});

router.put('/admin/posts/:postId/status', async (req, res, next) => {
  try {
    if (!requireAdminSecret(req, res)) return;
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    const post = await adminUpdatePetFeedPostStatus(postId, req.body?.status);
    if (!post) return res.status(404).json({ error: 'Pet feed post not found', code: 'PET_FEED_POST_NOT_FOUND' });
    void recordProductEvent({ userId: req.user.id, event: 'pet_feed_post_admin_status_updated', metadata: { postId, status: post.status } });
    return res.json({ data: post });
  } catch (err) {
    return next(err);
  }
});

router.get('/admin/reports', async (req, res, next) => {
  try {
    if (!requireAdminSecret(req, res)) return;
    const status = typeof req.query.status === 'string' ? req.query.status : 'open';
    const reports = await listAdminPetFeedReports(status);
    return res.json({ data: reports });
  } catch (err) {
    return next(err);
  }
});

export default router;
