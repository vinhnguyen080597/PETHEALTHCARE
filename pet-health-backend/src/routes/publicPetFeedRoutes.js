import { Router } from 'express';
import {
  getPublicBreederProfile,
  getPublicPetFeedPost,
  getPublishedPetFeedShareCard,
  listPetFeedPostComments,
  listPublicPetFeedPostPage,
  listPublicVerifiedBreederProfiles,
} from '../repositories/petFeedRepository.js';

const router = Router();

function cleanId(value) {
  return String(value || '').trim().slice(0, 80);
}

function setPublicCache(res) {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=120',
  });
}

router.get('/posts', async (req, res, next) => {
  try {
    setPublicCache(res);
    const page = await listPublicPetFeedPostPage({
      limit: req.query.limit,
      cursor: req.query.cursor,
      kind: req.query.kind,
    });
    return res.json(page);
  } catch (err) {
    return next(err);
  }
});

/** Slim OG card — default for share landing / crawlers (imageUrl, priceNote). */
router.get('/posts/:postId', async (req, res, next) => {
  try {
    setPublicCache(res);
    const postId = cleanId(req.params.postId);
    if (!postId || !/^[a-zA-Z0-9_-]+$/.test(postId)) {
      return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    }
    if (String(req.query.full || '') === '1') {
      const detail = await getPublicPetFeedPost(postId);
      if (!detail) {
        return res.status(404).json({ error: 'Pet feed post not found', code: 'PET_FEED_POST_NOT_FOUND' });
      }
      return res.json({ data: detail });
    }
    const card = await getPublishedPetFeedShareCard(postId);
    if (!card) {
      return res.status(404).json({ error: 'Pet feed post not found', code: 'PET_FEED_POST_NOT_FOUND' });
    }
    return res.json({ data: card });
  } catch (err) {
    return next(err);
  }
});

/** Full public listing detail for Next.js SSR. */
router.get('/posts/:postId/detail', async (req, res, next) => {
  try {
    setPublicCache(res);
    const postId = cleanId(req.params.postId);
    if (!postId || !/^[a-zA-Z0-9_-]+$/.test(postId)) {
      return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    }
    const detail = await getPublicPetFeedPost(postId);
    if (!detail) {
      return res.status(404).json({ error: 'Pet feed post not found', code: 'PET_FEED_POST_NOT_FOUND' });
    }
    return res.json({ data: detail });
  } catch (err) {
    return next(err);
  }
});

/** Public comments for a published listing (no auth). */
router.get('/posts/:postId/comments', async (req, res, next) => {
  try {
    setPublicCache(res);
    const postId = cleanId(req.params.postId);
    if (!postId || !/^[a-zA-Z0-9_-]+$/.test(postId)) {
      return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    }
    const detail = await getPublicPetFeedPost(postId);
    if (!detail) {
      return res.status(404).json({ error: 'Pet feed post not found', code: 'PET_FEED_POST_NOT_FOUND' });
    }
    const comments = await listPetFeedPostComments(postId, null, {
      limit: req.query.limit,
    });
    return res.json({ data: comments });
  } catch (err) {
    return next(err);
  }
});

router.get('/breeders', async (req, res, next) => {
  try {
    setPublicCache(res);
    const page = await listPublicVerifiedBreederProfiles({
      limit: req.query.limit,
    });
    return res.json(page);
  } catch (err) {
    return next(err);
  }
});

router.get('/breeders/:profileId', async (req, res, next) => {
  try {
    setPublicCache(res);
    const profileId = cleanId(req.params.profileId);
    if (!profileId || !/^[a-zA-Z0-9_-]+$/.test(profileId)) {
      return res.status(400).json({ error: 'profileId is required', code: 'MISSING_PROFILE_ID' });
    }
    const result = await getPublicBreederProfile(profileId);
    if (!result) {
      return res.status(404).json({ error: 'Breeder profile not found', code: 'BREEDER_PROFILE_NOT_FOUND' });
    }
    return res.json({ data: result });
  } catch (err) {
    return next(err);
  }
});

export default router;
