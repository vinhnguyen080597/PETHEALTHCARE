import { Router } from 'express';
import { getPublishedPetFeedShareCard } from '../repositories/petFeedRepository.js';

const router = Router();

function cleanId(value) {
  return String(value || '').trim().slice(0, 80);
}

router.get('/posts/:postId', async (req, res, next) => {
  try {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=120',
    });
    const postId = cleanId(req.params.postId);
    if (!postId || !/^[a-zA-Z0-9_-]+$/.test(postId)) {
      return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
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

export default router;
