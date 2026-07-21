import { Router } from 'express';
import multer from 'multer';
import { requireAnyRole, requireUser } from '../middleware/auth.js';
import {
  blockBreederProfile,
  cancelMyBreederVerificationRequest,
  countMyPetFeedVideoListingsSince,
  createAnnouncementPost,
  createPetFeedPost,
  createPetFeedPostComment,
  deletePetFeedPostComment,
  favoritePetFeedPost,
  getMyBreederProfile,
  getPetFeedPost,
  listFavoritePetFeedPosts,
  listMyAnnouncementPosts,
  listMyPetFeedPosts,
  listPetFeedPostComments,
  listPublishedPetFeedPostPage,
  listVerifiedBreederProfiles,
  reportBreederProfile,
  reportPetFeedComment,
  reportPetFeedPost,
  unblockBreederProfile,
  unfavoritePetFeedPost,
  updatePetFeedPost,
  upsertMyBreederProfile,
} from '../repositories/petFeedRepository.js';
import {
  PET_FEED_LIST_THUMB_MAX_BYTES,
  PET_FEED_PHOTO_MAX_BYTES,
  PET_FEED_UPLOAD_MAX_BYTES,
  PET_FEED_VIDEO_LISTINGS_PER_MONTH,
  PET_FEED_VIDEO_MAX_BYTES,
  petFeedPhotoMaxLabel,
  petFeedVideoMaxLabel,
} from '../constants/petFeedMediaLimits.js';
import {
  createPetFeedSignedUpload,
  isOwnedPetFeedPublicMediaUrl,
  storePetFeedImage,
  storePetFeedThumb,
  storePetFeedVideo,
} from '../services/imageStorageService.js';
import { recordProductEvent } from '../services/productAnalyticsService.js';

const router = Router();
const petFeedUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PET_FEED_UPLOAD_MAX_BYTES },
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

function validateUploadedFiles({ photos, video }, { requireComplete = true } = {}) {
  if (requireComplete && photos.length === 0) {
    throw badMedia('Please upload at least one clear photo for the Pet Feed post.', 'PET_FEED_PHOTO_REQUIRED');
  }
  if (requireComplete && !video) {
    throw badMedia('Please upload one short video for the Pet Feed post.', 'PET_FEED_VIDEO_REQUIRED');
  }
  for (const photo of photos) {
    if (!SUPPORTED_IMAGE_MIMES.has(photo.mimetype)) {
      throw badMedia('Unsupported photo type. Use JPEG, PNG, or WebP.', 'PET_FEED_UNSUPPORTED_PHOTO');
    }
    if (!Buffer.isBuffer(photo.buffer) || photo.buffer.length < 1024) {
      throw badMedia('Photo is too small or empty. Please upload a clear image.', 'PET_FEED_PHOTO_TOO_SMALL');
    }
    if (photo.size > PET_FEED_PHOTO_MAX_BYTES) {
      throw badMedia(`Photo is too large. Please use photos under ${petFeedPhotoMaxLabel()}.`, 'PET_FEED_PHOTO_TOO_LARGE');
    }
  }
  if (video) {
    if (!SUPPORTED_VIDEO_MIMES.has(video.mimetype)) {
      throw badMedia('Unsupported video type. Use MP4, MOV, WebM, or 3GP.', 'PET_FEED_UNSUPPORTED_VIDEO');
    }
    if (!Buffer.isBuffer(video.buffer) || video.buffer.length < 1024) {
      throw badMedia('Video is too small or empty. Please upload a real clip.', 'PET_FEED_VIDEO_TOO_SMALL');
    }
    if (video.size > PET_FEED_VIDEO_MAX_BYTES) {
      throw badMedia(`Video is too large. Please use a clip under ${petFeedVideoMaxLabel()}.`, 'PET_FEED_VIDEO_TOO_LARGE');
    }
  }
}

function validateDirectMediaUrls(userId, payload, { requireComplete = true } = {}) {
  const mediaUrls = Array.isArray(payload.mediaUrls ?? payload.media_urls)
    ? (payload.mediaUrls ?? payload.media_urls).map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : [];
  const videoUrlRaw = payload.videoUrl ?? payload.video_url;
  const videoUrl = typeof videoUrlRaw === 'string' ? videoUrlRaw.trim() : '';
  const metadata = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};
  const listThumbUrl = typeof metadata.list_thumb_url === 'string' ? metadata.list_thumb_url.trim() : '';
  const videoPosterUrl = typeof metadata.video_poster_url === 'string' ? metadata.video_poster_url.trim() : '';

  if (requireComplete && mediaUrls.length === 0) {
    throw badMedia('Please upload at least one clear photo for the Pet Feed post.', 'PET_FEED_PHOTO_REQUIRED');
  }
  if (requireComplete && !videoUrl) {
    throw badMedia('Please upload one short video for the Pet Feed post.', 'PET_FEED_VIDEO_REQUIRED');
  }
  for (const url of mediaUrls) {
    if (!isOwnedPetFeedPublicMediaUrl(userId, url, 'photo')) {
      throw badMedia('Invalid photo upload URL.', 'PET_FEED_MEDIA_URL_INVALID');
    }
  }
  if (videoUrl && !isOwnedPetFeedPublicMediaUrl(userId, videoUrl, 'video')) {
    throw badMedia('Invalid video upload URL.', 'PET_FEED_MEDIA_URL_INVALID');
  }
  if (listThumbUrl && !isOwnedPetFeedPublicMediaUrl(userId, listThumbUrl, 'thumb') && !isOwnedPetFeedPublicMediaUrl(userId, listThumbUrl, 'photo')) {
    throw badMedia('Invalid thumbnail upload URL.', 'PET_FEED_MEDIA_URL_INVALID');
  }
  if (videoPosterUrl && !isOwnedPetFeedPublicMediaUrl(userId, videoPosterUrl, 'thumb') && !isOwnedPetFeedPublicMediaUrl(userId, videoPosterUrl, 'photo')) {
    throw badMedia('Invalid video poster upload URL.', 'PET_FEED_MEDIA_URL_INVALID');
  }
  return { mediaUrls, videoUrl: videoUrl || null, listThumbUrl, videoPosterUrl };
}

function isDraftStatus(payload) {
  const status = typeof payload?.status === 'string' ? payload.status.trim().toLowerCase() : '';
  return status === 'draft';
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
    if (photo.size > PET_FEED_PHOTO_MAX_BYTES) {
      throw badMedia(`Photo is too large. Please use photos under ${petFeedPhotoMaxLabel()}.`, 'PET_FEED_PHOTO_TOO_LARGE');
    }
  }
  if (video) {
    if (!SUPPORTED_VIDEO_MIMES.has(video.mimetype)) {
      throw badMedia('Unsupported video type. Use MP4, MOV, WebM, or 3GP.', 'PET_FEED_UNSUPPORTED_VIDEO');
    }
    if (!Buffer.isBuffer(video.buffer) || video.buffer.length < 1024) {
      throw badMedia('Video is too small or empty. Please upload a real clip.', 'PET_FEED_VIDEO_TOO_SMALL');
    }
    if (video.size > PET_FEED_VIDEO_MAX_BYTES) {
      throw badMedia(`Video is too large. Please use a clip under ${petFeedVideoMaxLabel()}.`, 'PET_FEED_VIDEO_TOO_LARGE');
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

router.post('/uploads/sign', requireAnyRole('breeder', 'admin'), async (req, res, next) => {
  try {
    const kindRaw = typeof req.body?.kind === 'string' ? req.body.kind.trim().toLowerCase() : '';
    const contentType = typeof req.body?.contentType === 'string' ? req.body.contentType.trim().toLowerCase() : '';
    const kind = kindRaw === 'video' || kindRaw === 'thumb' ? kindRaw : kindRaw === 'photo' ? 'photo' : '';
    if (!kind) {
      return res.status(400).json({ error: 'kind must be photo, video, or thumb', code: 'INVALID_UPLOAD_KIND' });
    }
    const allowedMimes = kind === 'video' ? SUPPORTED_VIDEO_MIMES : SUPPORTED_IMAGE_MIMES;
    if (!allowedMimes.has(contentType)) {
      return res.status(400).json({
        error: kind === 'video' ? 'Unsupported video type. Use MP4, MOV, WebM, or 3GP.' : 'Unsupported photo type. Use JPEG, PNG, or WebP.',
        code: kind === 'video' ? 'PET_FEED_UNSUPPORTED_VIDEO' : 'PET_FEED_UNSUPPORTED_PHOTO',
      });
    }
    const maxBytes =
      kind === 'video' ? PET_FEED_VIDEO_MAX_BYTES : kind === 'thumb' ? PET_FEED_LIST_THUMB_MAX_BYTES : PET_FEED_PHOTO_MAX_BYTES;
    const signed = await createPetFeedSignedUpload({
      userId: req.user.id,
      kind,
      contentType,
    });
    if (!signed?.signedUrl || !signed?.publicUrl) {
      return res.status(503).json({
        error: 'Direct storage upload is unavailable. Retry later or use multipart upload.',
        code: 'STORAGE_SIGNED_UPLOAD_UNAVAILABLE',
      });
    }
    return res.status(201).json({
      data: {
        ...signed,
        maxBytes,
        kind,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/** Reliable device upload path: client → API → Supabase (service role). */
router.post('/uploads/file', requireAnyRole('breeder', 'admin'), petFeedUpload.single('file'), async (req, res, next) => {
  try {
    const kindRaw = typeof req.body?.kind === 'string' ? req.body.kind.trim().toLowerCase() : '';
    const kind = kindRaw === 'video' || kindRaw === 'thumb' ? kindRaw : 'photo';
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'file is required', code: 'PET_FEED_FILE_REQUIRED' });
    }
    if (kind === 'video') {
      if (!SUPPORTED_VIDEO_MIMES.has(file.mimetype)) {
        return res.status(400).json({ error: 'Unsupported video type.', code: 'PET_FEED_UNSUPPORTED_VIDEO' });
      }
      if (file.size > PET_FEED_VIDEO_MAX_BYTES) {
        return res.status(400).json({
          error: `Video is too large. Please use a clip under ${petFeedVideoMaxLabel()}.`,
          code: 'PET_FEED_VIDEO_TOO_LARGE',
        });
      }
      const publicUrl = await storePetFeedVideo({ userId: req.user.id, file, accessToken: req.accessToken });
      return res.status(201).json({ data: { publicUrl, kind } });
    }
    if (!SUPPORTED_IMAGE_MIMES.has(file.mimetype)) {
      return res.status(400).json({ error: 'Unsupported photo type.', code: 'PET_FEED_UNSUPPORTED_PHOTO' });
    }
    const maxBytes = kind === 'thumb' ? PET_FEED_LIST_THUMB_MAX_BYTES : PET_FEED_PHOTO_MAX_BYTES;
    if (file.size > maxBytes) {
      return res.status(400).json({
        error: `Photo is too large. Please use photos under ${petFeedPhotoMaxLabel()}.`,
        code: 'PET_FEED_PHOTO_TOO_LARGE',
      });
    }
    const publicUrl =
      kind === 'thumb'
        ? await storePetFeedThumb({ userId: req.user.id, file, accessToken: req.accessToken })
        : await storePetFeedImage({ userId: req.user.id, file, accessToken: req.accessToken });
    return res.status(201).json({ data: { publicUrl, kind } });
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
    const hasFiles = photos.length > 0 || Boolean(video);
    const draft = isDraftStatus(payload);

    let postPayload;
    if (hasFiles) {
      validateUploadedFiles({ photos, video }, { requireComplete: !draft });
      const uploadedPhotoUrls = [];
      for (const photo of photos) {
        uploadedPhotoUrls.push(await storePetFeedImage({ userId: req.user.id, file: photo, accessToken: req.accessToken }));
      }
      const uploadedVideoUrl = video
        ? await storePetFeedVideo({ userId: req.user.id, file: video, accessToken: req.accessToken })
        : '';
      postPayload = {
        ...payload,
        mediaUrls: uploadedPhotoUrls,
        videoUrl: uploadedVideoUrl || null,
      };
    } else if (hasClientProvidedMediaReferences(payload) || draft) {
      const validated = validateDirectMediaUrls(req.user.id, payload, { requireComplete: !draft });
      const metadata = {
        ...(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}),
      };
      if (validated.listThumbUrl) metadata.list_thumb_url = validated.listThumbUrl;
      if (validated.videoPosterUrl) metadata.video_poster_url = validated.videoPosterUrl;
      postPayload = {
        ...payload,
        mediaUrls: validated.mediaUrls,
        videoUrl: validated.videoUrl,
        metadata,
      };
    } else {
      throw badMedia('Please upload at least one clear photo and one short video for the Pet Feed post.', 'PET_FEED_MEDIA_UPLOAD_REQUIRED');
    }

    // Quota only when submitting for review / publish with a video (not private drafts without going live).
    if (postPayload.videoUrl && !draft) {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const used = await countMyPetFeedVideoListingsSince(req.user.id, monthStart.toISOString(), req.accessToken);
      if (used >= PET_FEED_VIDEO_LISTINGS_PER_MONTH) {
        return res.status(429).json({
          error: `Monthly video listing limit reached (${PET_FEED_VIDEO_LISTINGS_PER_MONTH}).`,
          code: 'PET_FEED_VIDEO_QUOTA_EXCEEDED',
        });
      }
    }

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
    const existing = await getPetFeedPost(req.user.id, postId, req.accessToken);
    if (!existing || existing.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Pet feed post not found', code: 'PET_FEED_POST_NOT_FOUND' });
    }

    const body = req.body ?? {};
    const nextStatus = typeof body.status === 'string' ? body.status.trim().toLowerCase() : '';
    const submittingForReview = nextStatus === 'pending_review';
    let updatePayload = { ...body };

    if (hasClientProvidedMediaReferences(body)) {
      if (existing.status !== 'draft') {
        return res.status(400).json({
          error: 'Pet Feed media changes must be uploaded as files for review.',
          code: 'PET_FEED_MEDIA_UPLOAD_REQUIRED',
        });
      }
      const validated = validateDirectMediaUrls(req.user.id, body, { requireComplete: submittingForReview });
      const metadata = {
        ...(existing.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
        ...(body.metadata && typeof body.metadata === 'object' ? body.metadata : {}),
      };
      if (validated.listThumbUrl) metadata.list_thumb_url = validated.listThumbUrl;
      if (validated.videoPosterUrl) metadata.video_poster_url = validated.videoPosterUrl;
      updatePayload = {
        ...updatePayload,
        mediaUrls: validated.mediaUrls,
        videoUrl: validated.videoUrl,
        metadata,
      };
    } else if (submittingForReview) {
      const media = Array.isArray(existing.media_urls) ? existing.media_urls.filter(Boolean) : [];
      if (media.length === 0 || !existing.video_url) {
        return res.status(400).json({
          error: 'Add at least one photo and one video before submitting for review.',
          code: 'PET_FEED_MEDIA_UPLOAD_REQUIRED',
        });
      }
    }

    const post = await updatePetFeedPost(req.user.id, postId, updatePayload, req.accessToken);
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

router.get('/posts/:postId/comments', async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    const comments = await listPetFeedPostComments(postId, req.accessToken, { limit: firstQueryValue(req.query.limit) });
    return res.json({ data: comments });
  } catch (err) {
    return next(err);
  }
});

router.post('/posts/:postId/comments', async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    const body = typeof req.body?.body === 'string' ? req.body.body : typeof req.body?.text === 'string' ? req.body.text : '';
    const parentId = typeof req.body?.parentId === 'string'
      ? req.body.parentId
      : typeof req.body?.parent_id === 'string'
        ? req.body.parent_id
        : null;
    const comment = await createPetFeedPostComment(req.user.id, postId, body, req.accessToken, { parentId });
    void recordProductEvent({
      userId: req.user.id,
      event: 'pet_feed_comment_created',
      metadata: { postId, commentId: comment.id, parentId: comment.parent_id },
    });
    return res.status(201).json({ data: comment });
  } catch (err) {
    return next(err);
  }
});

router.delete('/comments/:commentId', async (req, res, next) => {
  try {
    const commentId = cleanId(req.params.commentId);
    if (!commentId) return res.status(400).json({ error: 'commentId is required', code: 'MISSING_COMMENT_ID' });
    await deletePetFeedPostComment(req.user.id, commentId, req.accessToken);
    void recordProductEvent({ userId: req.user.id, event: 'pet_feed_comment_deleted', metadata: { commentId } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

router.post('/comments/:commentId/report', async (req, res, next) => {
  try {
    const commentId = cleanId(req.params.commentId);
    if (!commentId) return res.status(400).json({ error: 'commentId is required', code: 'MISSING_COMMENT_ID' });
    const report = await reportPetFeedComment(req.user.id, commentId, req.body ?? {}, req.accessToken);
    void recordProductEvent({
      userId: req.user.id,
      event: 'pet_feed_comment_reported',
      metadata: { commentId, reason: report.reason },
    });
    return res.status(201).json({ data: report });
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

router.post('/breeder-profile/me/cancel', async (req, res, next) => {
  try {
    const profile = await cancelMyBreederVerificationRequest(req.user.id, req.accessToken);
    void recordProductEvent({ userId: req.user.id, event: 'breeder_verification_cancelled', metadata: { status: profile.verification_status } });
    return res.json({ data: profile });
  } catch (err) {
    return next(err);
  }
});

export default router;
