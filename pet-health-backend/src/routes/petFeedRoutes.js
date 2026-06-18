import { Router } from 'express';
import multer from 'multer';
import { requireAnyRole, requireUser } from '../middleware/auth.js';
import {
  blockBreederProfile,
  createAnnouncementPost,
  createPetFeedPost,
  favoritePetFeedPost,
  getMyBreederProfile,
  getPetFeedPost,
  listFavoritePetFeedPosts,
  listMyAnnouncementPosts,
  listMyPetFeedPosts,
  listPublishedPetFeedPostPage,
  listVerifiedBreederProfiles,
  reportBreederProfile,
  reportPetFeedPost,
  unblockBreederProfile,
  unfavoritePetFeedPost,
  updatePetFeedPost,
  upsertMyBreederProfile,
} from '../repositories/petFeedRepository.js';
import { storePetFeedImage, storePetFeedVideo } from '../services/imageStorageService.js';
import { recordProductEvent } from '../services/productAnalyticsService.js';

const router = Router();
const petFeedUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});
const SUPPORTED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SUPPORTED_VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp']);
router.use(requireUser);

function parsePostPayload(body) {
  if (typeof body?.payload === 'string') {
    try {
      const parsed = JSON.parse(body.payload);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_err) {
      const err = new Error('Invalid post payload JSON.');
      err.status = 400;
      err.code = 'INVALID_POST_PAYLOAD';
      throw err;
    }
  }
  return body ?? {};
}

function badMedia(message, code) {
  const err = new Error(message);
  err.status = 400;
  err.code = code;
  return err;
}

function validatePetFeedMedia({ payload, photos, video }) {
  const clientMediaUrls = Array.isArray(payload.mediaUrls ?? payload.media_urls)
    ? (payload.mediaUrls ?? payload.media_urls).filter(Boolean)
    : [];
  const clientVideoUrl = typeof (payload.videoUrl ?? payload.video_url) === 'string' && (payload.videoUrl ?? payload.video_url).trim();
  if (clientMediaUrls.length > 0 || clientVideoUrl) {
    throw badMedia('Pet Feed media must be uploaded as files for review.', 'PET_FEED_MEDIA_UPLOAD_REQUIRED');
  }

  if (photos.length === 0) {
    throw badMedia('Please upload at least one clear photo for the Pet Feed post.', 'PET_FEED_PHOTO_REQUIRED');
  }
  if (!video) {
    throw badMedia('Please upload one short video for the Pet Feed post.', 'PET_FEED_VIDEO_REQUIRED');
  }
  for (const photo of photos) {
    if (!SUPPORTED_IMAGE_MIMES.has(photo.mimetype)) {
      throw badMedia('Unsupported photo type. Use JPEG, PNG, or WebP.', 'PET_FEED_UNSUPPORTED_PHOTO');
    }
    if (!Buffer.isBuffer(photo.buffer) || photo.buffer.length < 1024) {
      throw badMedia('Photo is too small or empty. Please upload a clear image.', 'PET_FEED_PHOTO_TOO_SMALL');
    }
    if (photo.size > 8 * 1024 * 1024) {
      throw badMedia('Photo is too large. Please use photos under 8MB.', 'PET_FEED_PHOTO_TOO_LARGE');
    }
  }
  if (video) {
    if (!SUPPORTED_VIDEO_MIMES.has(video.mimetype)) {
      throw badMedia('Unsupported video type. Use MP4, MOV, WebM, or 3GP.', 'PET_FEED_UNSUPPORTED_VIDEO');
    }
    if (!Buffer.isBuffer(video.buffer) || video.buffer.length < 1024) {
      throw badMedia('Video is too small or empty. Please upload a real clip.', 'PET_FEED_VIDEO_TOO_SMALL');
    }
    if (video.size > 20 * 1024 * 1024) {
      throw badMedia('Video is too large. Please use a short clip under 20MB.', 'PET_FEED_VIDEO_TOO_LARGE');
    }
  }
}

function cleanId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstQueryValue(value) {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
}

function hasClientProvidedMediaReferences(payload) {
  const mediaUrls = payload?.mediaUrls ?? payload?.media_urls;
  const videoUrl = payload?.videoUrl ?? payload?.video_url;
  return (
    (Array.isArray(mediaUrls) && mediaUrls.some(Boolean)) ||
    (typeof videoUrl === 'string' && videoUrl.trim().length > 0)
  );
}

function validateAnnouncementMedia({ photos, video }) {
  if (photos.length > 6) {
    throw badMedia('You can upload up to 6 photos.', 'ANNOUNCEMENT_TOO_MANY_PHOTOS');
  }
  for (const photo of photos) {
    if (!SUPPORTED_IMAGE_MIMES.has(photo.mimetype)) {
      throw badMedia('Unsupported photo type. Use JPEG, PNG, or WebP.', 'PET_FEED_UNSUPPORTED_PHOTO');
    }
    if (!Buffer.isBuffer(photo.buffer) || photo.buffer.length < 1024) {
      throw badMedia('Photo is too small or empty. Please upload a clear image.', 'PET_FEED_PHOTO_TOO_SMALL');
    }
    if (photo.size > 8 * 1024 * 1024) {
      throw badMedia('Photo is too large. Please use photos under 8MB.', 'PET_FEED_PHOTO_TOO_LARGE');
    }
  }
  if (video) {
    if (!SUPPORTED_VIDEO_MIMES.has(video.mimetype)) {
      throw badMedia('Unsupported video type. Use MP4, MOV, WebM, or 3GP.', 'PET_FEED_UNSUPPORTED_VIDEO');
    }
    if (!Buffer.isBuffer(video.buffer) || video.buffer.length < 1024) {
      throw badMedia('Video is too small or empty. Please upload a real clip.', 'PET_FEED_VIDEO_TOO_SMALL');
    }
    if (video.size > 20 * 1024 * 1024) {
      throw badMedia('Video is too large. Please use a short clip under 20MB.', 'PET_FEED_VIDEO_TOO_LARGE');
    }
  }
}

router.get('/posts', async (req, res, next) => {
  try {
    const kind = firstQueryValue(req.query.kind);
    const page = await listPublishedPetFeedPostPage(req.user.id, req.accessToken, {
      limit: firstQueryValue(req.query.limit),
      cursor: firstQueryValue(req.query.cursor),
      kind: kind === 'announcement' ? 'announcement' : 'listing',
    });
    return res.json(page);
  } catch (err) {
    return next(err);
  }
});

router.get('/breeders', async (req, res, next) => {
  try {
    const profiles = await listVerifiedBreederProfiles(req.user.id, req.accessToken);
    return res.json({ data: profiles });
  } catch (err) {
    return next(err);
  }
});

router.post('/breeders/:profileId/report', async (req, res, next) => {
  try {
    const profileId = cleanId(req.params.profileId);
    if (!profileId) return res.status(400).json({ error: 'profileId is required', code: 'MISSING_PROFILE_ID' });
    const report = await reportBreederProfile(req.user.id, profileId, req.body ?? {}, req.accessToken);
    void recordProductEvent({
      userId: req.user.id,
      event: 'breeder_profile_reported',
      metadata: { profileId, reason: report.reason },
    });
    return res.status(201).json({ data: report });
  } catch (err) {
    return next(err);
  }
});

router.post('/breeders/:profileId/block', async (req, res, next) => {
  try {
    const profileId = cleanId(req.params.profileId);
    if (!profileId) return res.status(400).json({ error: 'profileId is required', code: 'MISSING_PROFILE_ID' });
    await blockBreederProfile(req.user.id, profileId, req.accessToken);
    void recordProductEvent({ userId: req.user.id, event: 'breeder_profile_blocked', metadata: { profileId } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

router.delete('/breeders/:profileId/block', async (req, res, next) => {
  try {
    const profileId = cleanId(req.params.profileId);
    if (!profileId) return res.status(400).json({ error: 'profileId is required', code: 'MISSING_PROFILE_ID' });
    await unblockBreederProfile(req.user.id, profileId, req.accessToken);
    return res.status(204).send();
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

router.post('/posts', requireAnyRole('breeder'), petFeedUpload.fields([
  { name: 'photos', maxCount: 6 },
  { name: 'video', maxCount: 1 },
]), async (req, res, next) => {
  try {
    const payload = parsePostPayload(req.body);
    const photos = Array.isArray(req.files?.photos) ? req.files.photos : [];
    const video = Array.isArray(req.files?.video) ? req.files.video[0] : null;
    validatePetFeedMedia({ payload, photos, video });

    const uploadedPhotoUrls = [];
    for (const photo of photos) {
      uploadedPhotoUrls.push(await storePetFeedImage({ userId: req.user.id, file: photo, accessToken: req.accessToken }));
    }
    const uploadedVideoUrl = video
      ? await storePetFeedVideo({ userId: req.user.id, file: video, accessToken: req.accessToken })
      : '';
    const postPayload = {
      ...payload,
      mediaUrls: uploadedPhotoUrls,
      videoUrl: uploadedVideoUrl || null,
    };

    const post = await createPetFeedPost(req.user.id, postPayload, req.accessToken);
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

router.post('/announcements', requireAnyRole('admin'), petFeedUpload.fields([
  { name: 'photos', maxCount: 6 },
  { name: 'video', maxCount: 1 },
]), async (req, res, next) => {
  try {
    const payload = parsePostPayload(req.body);
    const photos = Array.isArray(req.files?.photos) ? req.files.photos : [];
    const video = Array.isArray(req.files?.video) ? req.files.video[0] : null;
    validateAnnouncementMedia({ photos, video });

    const uploadedPhotoUrls = [];
    for (const photo of photos) {
      uploadedPhotoUrls.push(await storePetFeedImage({ userId: req.user.id, file: photo, accessToken: req.accessToken }));
    }
    const uploadedVideoUrl = video
      ? await storePetFeedVideo({ userId: req.user.id, file: video, accessToken: req.accessToken })
      : '';
    const post = await createAnnouncementPost(req.user.id, {
      ...payload,
      mediaUrls: uploadedPhotoUrls,
      videoUrl: uploadedVideoUrl || null,
    }, req.accessToken);
    void recordProductEvent({
      userId: req.user.id,
      event: 'announcement_post_created',
      metadata: { category: post.metadata?.category },
    });
    return res.status(201).json({ data: post });
  } catch (err) {
    return next(err);
  }
});

router.get('/my-announcements', requireAnyRole('admin'), async (req, res, next) => {
  try {
    const posts = await listMyAnnouncementPosts(req.user.id, req.accessToken);
    return res.json({ data: posts });
  } catch (err) {
    return next(err);
  }
});

router.get('/my-posts', requireAnyRole('breeder'), async (req, res, next) => {
  try {
    const posts = await listMyPetFeedPosts(req.user.id, req.accessToken);
    return res.json({ data: posts });
  } catch (err) {
    return next(err);
  }
});

router.put('/posts/:postId', requireAnyRole('breeder'), async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    if (hasClientProvidedMediaReferences(req.body ?? {})) {
      return res.status(400).json({
        error: 'Pet Feed media changes must be uploaded as files for review.',
        code: 'PET_FEED_MEDIA_UPLOAD_REQUIRED',
      });
    }
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

export default router;
