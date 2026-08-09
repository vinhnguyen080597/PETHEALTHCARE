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
  countMyPetFeedPostStats,
  listMyAnnouncementPosts,
  listMyPetFeedPosts,
  listPetFeedPostComments,
  listPublishedPetFeedPostPage,
  listVerifiedBreederProfiles,
  reportBreederProfile,
  reportPetFeedPost,
  unblockBreederProfile,
  unfavoritePetFeedPost,
  archiveMyPetFeedPost,
  updatePetFeedPost,
  upsertMyBreederProfile,
  updateMyBreederProfilePhotos,
  createMyWarrantyPolicy,
  deleteMyWarrantyPolicy,
  updateMyWarrantyPolicy,
  listMyWarrantyPolicies,
  confirmListingDeposit,
  cancelListingDeposit,
  confirmListingComplete,
} from '../repositories/petFeedRepository.js';
import {
  getPetFeedConversation,
  listPetFeedConversationMessages,
  listPetFeedConversations,
  markPetFeedConversationRead,
  openPetFeedConversation,
  sendPetFeedConversationMessage,
} from '../repositories/petFeedMessagingRepository.js';
import {
  countUnreadPetFeedNotifications,
  createAdminRequestNotifications,
  createDealNotification,
  createPostCommentNotification,
  listPetFeedNotifications,
  markPetFeedNotificationsRead,
} from '../repositories/petFeedNotificationsRepository.js';
import { recordAdminAction } from '../repositories/adminActionLogRepository.js';
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
  storeBreederProfileImage,
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
  let parsed;
  if (typeof body?.payload === 'string') {
    try {
      const json = JSON.parse(body.payload);
      parsed = json && typeof json === 'object' ? json : {};
    } catch (_err) {
      const err = new Error('Invalid post payload JSON.');
      err.status = 400;
      err.code = 'INVALID_POST_PAYLOAD';
      throw err;
    }
  } else {
    parsed = body ?? {};
  }
  const metadata = {
    ...(parsed.metadata && typeof parsed.metadata === 'object' ? parsed.metadata : {}),
  };
  if (parsed.warranty_policy_id !== undefined || parsed.warrantyPolicyId !== undefined) {
    metadata.warranty_policy_id = parsed.warranty_policy_id ?? parsed.warrantyPolicyId ?? null;
  }
  return { ...parsed, metadata };
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

function notifyPreview(value, max = 80) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function firstQueryValue(value) {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
}

function parsePositiveInt(value, max = 50) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.min(parsed, max);
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
    void createAdminRequestNotifications({
      actorUserId: req.user.id,
      type: 'admin_report_open',
      bodyPreview: `Báo cáo hồ sơ trại mới (${report.reason || 'other'}).`,
      breederProfileId: profileId,
      metadata: {
        title: 'Báo cáo hồ sơ trại',
        report_id: report.id,
        reason: report.reason,
      },
      accessToken: req.accessToken,
    }).catch(() => null);
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
    if (post.status === 'pending_review') {
      void createAdminRequestNotifications({
        actorUserId: req.user.id,
        type: 'admin_listing_pending',
        bodyPreview: `Bài đăng "${notifyPreview(post.title)}" chờ duyệt.`,
        postId: post.id,
        breederProfileId: post.breeder_profile_id || null,
        metadata: {
          title: post.title || '',
          thumb_url: Array.isArray(post.media_urls) ? post.media_urls[0] : null,
        },
        accessToken: req.accessToken,
      }).catch(() => null);
    }
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
    void recordAdminAction({
      actorUserId: req.user?.id || null,
      viaSecret: false,
      action: 'announcement.create',
      targetType: 'announcement',
      targetId: post.id,
      targetUserId: req.user?.id || null,
      beforeState: {},
      afterState: {
        title: post.title || null,
        status: post.status || null,
        category: post.metadata?.category || null,
        media_count: Array.isArray(post.media_urls) ? post.media_urls.length : 0,
        has_video: Boolean(post.video_url),
      },
      metadata: {},
    }).catch(() => null);
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
    const limit = parsePositiveInt(firstQueryValue(req.query.limit));
    const posts = await listMyPetFeedPosts(req.user.id, req.accessToken, { limit });
    if (limit) {
      const meta = await countMyPetFeedPostStats(req.user.id, req.accessToken);
      return res.json({ data: posts, meta });
    }
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
      // Owners may re-attach existing/uploaded media URLs when saving draft or re-submitting for review.
      if (existing.status !== 'draft' && nextStatus !== 'draft' && !submittingForReview) {
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
    if (post.status === 'pending_review' && existing.status !== 'pending_review') {
      void createAdminRequestNotifications({
        actorUserId: req.user.id,
        type: 'admin_listing_pending',
        bodyPreview: `Bài đăng "${notifyPreview(post.title)}" chờ duyệt.`,
        postId: post.id,
        breederProfileId: post.breeder_profile_id || null,
        metadata: {
          title: post.title || '',
          thumb_url: Array.isArray(post.media_urls) ? post.media_urls[0] : null,
        },
        accessToken: req.accessToken,
      }).catch(() => null);
    }
    return res.json({ data: post });
  } catch (err) {
    return next(err);
  }
});

router.delete('/posts/:postId', requireAnyRole('breeder'), async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    const post = await archiveMyPetFeedPost(req.user.id, postId, req.accessToken);
    if (!post) return res.status(404).json({ error: 'Pet feed post not found', code: 'PET_FEED_POST_NOT_FOUND' });
    void recordProductEvent({ userId: req.user.id, event: 'pet_feed_post_archived', metadata: { postId } });
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
    const post = await getPetFeedPost(req.user.id, postId, req.accessToken).catch(() => null);
    if (post?.user_id && post.user_id !== req.user.id) {
      void createPostCommentNotification({
        recipientUserId: post.user_id,
        actorUserId: req.user.id,
        postId,
        commentId: comment.id,
        bodyPreview: comment.body,
        accessToken: req.accessToken,
      }).catch(() => null);
    }
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

router.post('/posts/:postId/conversations', async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    const conversation = await openPetFeedConversation(req.user.id, postId, req.accessToken);
    void recordProductEvent({
      userId: req.user.id,
      event: 'pet_feed_conversation_opened',
      metadata: { postId, conversationId: conversation.id },
    });
    return res.status(201).json({ data: conversation });
  } catch (err) {
    return next(err);
  }
});

router.get('/conversations', async (req, res, next) => {
  try {
    const conversations = await listPetFeedConversations(req.user.id, req.accessToken);
    return res.json({ data: conversations });
  } catch (err) {
    return next(err);
  }
});

router.get('/conversations/:conversationId', async (req, res, next) => {
  try {
    const conversationId = cleanId(req.params.conversationId);
    if (!conversationId) return res.status(400).json({ error: 'conversationId is required', code: 'MISSING_CONVERSATION_ID' });
    const conversation = await getPetFeedConversation(req.user.id, conversationId, req.accessToken);
    return res.json({ data: conversation });
  } catch (err) {
    return next(err);
  }
});

router.get('/conversations/:conversationId/messages', async (req, res, next) => {
  try {
    const conversationId = cleanId(req.params.conversationId);
    if (!conversationId) return res.status(400).json({ error: 'conversationId is required', code: 'MISSING_CONVERSATION_ID' });
    const messages = await listPetFeedConversationMessages(req.user.id, conversationId, req.accessToken, {
      limit: firstQueryValue(req.query.limit),
      markRead: true,
    });
    return res.json({ data: messages });
  } catch (err) {
    return next(err);
  }
});

router.post('/conversations/:conversationId/read', async (req, res, next) => {
  try {
    const conversationId = cleanId(req.params.conversationId);
    if (!conversationId) return res.status(400).json({ error: 'conversationId is required', code: 'MISSING_CONVERSATION_ID' });
    const conversation = await markPetFeedConversationRead(req.user.id, conversationId, req.accessToken);
    return res.json({ data: conversation });
  } catch (err) {
    return next(err);
  }
});

router.post('/conversations/:conversationId/messages', async (req, res, next) => {
  try {
    const conversationId = cleanId(req.params.conversationId);
    if (!conversationId) return res.status(400).json({ error: 'conversationId is required', code: 'MISSING_CONVERSATION_ID' });
    const body = typeof req.body?.body === 'string' ? req.body.body : typeof req.body?.text === 'string' ? req.body.text : '';
    const message = await sendPetFeedConversationMessage(req.user.id, conversationId, body, req.accessToken);
    void recordProductEvent({
      userId: req.user.id,
      event: 'pet_feed_message_sent',
      metadata: { conversationId, messageId: message.id },
    });
    return res.status(201).json({ data: message });
  } catch (err) {
    return next(err);
  }
});

router.get('/notifications', async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      listPetFeedNotifications(req.user.id, req.accessToken, { limit: firstQueryValue(req.query.limit) }),
      countUnreadPetFeedNotifications(req.user.id, req.accessToken),
    ]);
    return res.json({ data: notifications, unread_count: unreadCount });
  } catch (err) {
    return next(err);
  }
});

router.get('/notifications/unread-count', async (req, res, next) => {
  try {
    const unreadCount = await countUnreadPetFeedNotifications(req.user.id, req.accessToken);
    return res.json({ data: { unread_count: unreadCount } });
  } catch (err) {
    return next(err);
  }
});

router.post('/notifications/read', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : undefined;
    const result = await markPetFeedNotificationsRead(req.user.id, req.accessToken, { ids });
    return res.json({ data: result });
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
    void createAdminRequestNotifications({
      actorUserId: req.user.id,
      type: 'admin_report_open',
      bodyPreview: `Báo cáo bài đăng mới (${report.reason || 'other'}).`,
      postId,
      metadata: {
        title: 'Báo cáo bài đăng',
        report_id: report.id,
        reason: report.reason,
      },
      accessToken: req.accessToken,
    }).catch(() => null);
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
    const before = await getMyBreederProfile(req.user.id, req.accessToken);
    const profile = await upsertMyBreederProfile(req.user.id, req.body ?? {}, req.accessToken);
    void recordProductEvent({ userId: req.user.id, event: 'breeder_profile_upserted', metadata: { status: profile.verification_status } });
    if (
      profile.verification_status === 'pending_review'
      && before?.verification_status !== 'pending_review'
    ) {
      void createAdminRequestNotifications({
        actorUserId: req.user.id,
        type: 'admin_breeder_pending',
        bodyPreview: `${notifyPreview(profile.display_name) || 'Người dùng'} gửi yêu cầu xác minh Breeder.`,
        breederProfileId: profile.id,
        metadata: {
          title: profile.display_name || '',
          thumb_url: profile.avatar_url || null,
        },
        accessToken: req.accessToken,
      }).catch(() => null);
    }
    return res.json({ data: profile });
  } catch (err) {
    return next(err);
  }
});

const BREEDER_PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

router.post(
  '/breeder-profile/me/upload',
  petFeedUpload.single('file'),
  async (req, res, next) => {
    try {
      const kindRaw = typeof req.body?.kind === 'string' ? req.body.kind.trim().toLowerCase() : '';
      const kind = kindRaw === 'cover' ? 'cover' : kindRaw === 'avatar' ? 'avatar' : '';
      if (!kind) {
        return res.status(400).json({ error: 'kind must be avatar or cover', code: 'INVALID_UPLOAD_KIND' });
      }
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'file is required', code: 'BREEDER_FILE_REQUIRED' });
      }
      if (!SUPPORTED_IMAGE_MIMES.has(file.mimetype)) {
        return res.status(400).json({
          error: 'Unsupported photo type. Use JPEG, PNG, or WebP.',
          code: 'BREEDER_UNSUPPORTED_PHOTO',
        });
      }
      if (file.size > BREEDER_PROFILE_IMAGE_MAX_BYTES) {
        return res.status(400).json({
          error: 'Photo is too large. Please use an image under 5MB.',
          code: 'BREEDER_PHOTO_TOO_LARGE',
        });
      }
      const publicUrl = await storeBreederProfileImage({
        userId: req.user.id,
        kind,
        file,
        accessToken: req.accessToken,
      });
      if (typeof publicUrl === 'string' && publicUrl.startsWith('memory://')) {
        return res.status(503).json({
          error: 'Photo storage is unavailable. Please retry shortly.',
          code: 'BREEDER_PHOTO_STORAGE_UNAVAILABLE',
        });
      }
      const persistRaw = typeof req.body?.persist === 'string' ? req.body.persist.trim().toLowerCase() : '';
      const shouldPersist = persistRaw === '1' || persistRaw === 'true' || req.body?.persist === true;
      if (shouldPersist) {
        const profile = await updateMyBreederProfilePhotos(
          req.user.id,
          kind === 'cover' ? { coverUrl: publicUrl } : { avatarUrl: publicUrl },
          req.accessToken,
        );
        return res.status(201).json({ data: { publicUrl, kind, profile } });
      }
      return res.status(201).json({ data: { publicUrl, kind } });
    } catch (err) {
      return next(err);
    }
  },
);

router.patch('/breeder-profile/me/photos', async (req, res, next) => {
  try {
    const profile = await updateMyBreederProfilePhotos(req.user.id, req.body ?? {}, req.accessToken);
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

router.get('/breeder-profile/me/warranty-policies', requireAnyRole('breeder', 'admin'), async (req, res, next) => {
  try {
    const profile = await getMyBreederProfile(req.user.id, req.accessToken);
    return res.json({
      data: listMyWarrantyPolicies(profile),
      meta: {
        trust_awarded: Boolean(profile?.warranty_policy_trust_awarded),
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.post(
  '/breeder-profile/me/warranty-policies',
  requireAnyRole('breeder', 'admin'),
  async (req, res, next) => {
    try {
      const result = await createMyWarrantyPolicy(req.user.id, req.body ?? {}, req.accessToken);
      void recordProductEvent({
        userId: req.user.id,
        event: 'warranty_policy_created',
        metadata: { trust_awarded: result.trust_awarded },
      });
      return res.status(201).json({
        data: result.policy,
        profile: result.profile,
        trust_awarded: result.trust_awarded,
      });
    } catch (err) {
      return next(err);
    }
  },
);

router.delete(
  '/breeder-profile/me/warranty-policies/:policyId',
  requireAnyRole('breeder', 'admin'),
  async (req, res, next) => {
    try {
      const policyId = cleanId(req.params.policyId);
      if (!policyId) {
        return res.status(400).json({ error: 'policyId is required', code: 'WARRANTY_POLICY_ID_REQUIRED' });
      }
      const profile = await deleteMyWarrantyPolicy(req.user.id, policyId, req.accessToken);
      return res.json({ data: profile });
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/breeder-profile/me/warranty-policies/:policyId',
  requireAnyRole('breeder', 'admin'),
  async (req, res, next) => {
    try {
      const policyId = cleanId(req.params.policyId);
      if (!policyId) {
        return res.status(400).json({ error: 'policyId is required', code: 'WARRANTY_POLICY_ID_REQUIRED' });
      }
      const result = await updateMyWarrantyPolicy(
        req.user.id,
        policyId,
        req.body ?? {},
        req.accessToken,
      );
      void recordProductEvent({
        userId: req.user.id,
        event: 'warranty_policy_updated',
        metadata: { policy_id: policyId },
      });
      return res.json({ data: result.policy, profile: result.profile });
    } catch (err) {
      return next(err);
    }
  },
);

function dealNotifyMeta(post) {
  return {
    title: post?.title || '',
    thumb_url: Array.isArray(post?.media_urls) ? post.media_urls[0] : null,
    breeder_profile_id: post?.breeder_profile_id || null,
    cta_href: post?.id ? `/app/posts/${encodeURIComponent(post.id)}` : undefined,
  };
}

router.post('/posts/:postId/deposit/confirm', async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    const result = await confirmListingDeposit(req.user.id, postId, req.body ?? {}, req.accessToken);
    const notifyType = result.both_confirmed ? 'deposit_confirmed' : 'deposit_request';
    const preview = result.both_confirmed
      ? `Cọc đã được xác nhận cho "${notifyPreview(result.post.title)}". Chính sách bảo hành đã đóng băng.`
      : `Yêu cầu chốt cọc cho "${notifyPreview(result.post.title)}". Vui lòng xác nhận.`;
    if (result.notify_user_id) {
      void createDealNotification({
        recipientUserId: result.notify_user_id,
        actorUserId: req.user.id,
        postId: result.post.id,
        type: notifyType,
        bodyPreview: preview,
        metadata: dealNotifyMeta(result.post),
        accessToken: req.accessToken,
      }).catch(() => null);
    }
    return res.json({ data: result.post, both_confirmed: result.both_confirmed });
  } catch (err) {
    return next(err);
  }
});

router.post('/posts/:postId/deposit/cancel', async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    const result = await cancelListingDeposit(req.user.id, postId, req.accessToken);
    if (result.notify_user_id) {
      void createDealNotification({
        recipientUserId: result.notify_user_id,
        actorUserId: req.user.id,
        postId: result.post.id,
        type: 'deposit_cancelled',
        bodyPreview: `Cọc cho "${notifyPreview(result.post.title)}" đã bị hủy.`,
        metadata: dealNotifyMeta(result.post),
        accessToken: req.accessToken,
      }).catch(() => null);
    }
    return res.json({ data: result.post });
  } catch (err) {
    return next(err);
  }
});

router.post('/posts/:postId/complete/confirm', async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId) return res.status(400).json({ error: 'postId is required', code: 'MISSING_POST_ID' });
    const result = await confirmListingComplete(req.user.id, postId, req.accessToken);
    const notifyType = result.both_confirmed ? 'deal_completed' : 'deal_complete_request';
    const preview = result.both_confirmed
      ? `Giao dịch "${notifyPreview(result.post.title)}" đã hoàn thành.`
      : `Yêu cầu xác nhận giao nhận cho "${notifyPreview(result.post.title)}".`;
    if (result.notify_user_id) {
      void createDealNotification({
        recipientUserId: result.notify_user_id,
        actorUserId: req.user.id,
        postId: result.post.id,
        type: notifyType,
        bodyPreview: preview,
        metadata: dealNotifyMeta(result.post),
        accessToken: req.accessToken,
      }).catch(() => null);
    }
    return res.json({ data: result.post, both_confirmed: result.both_confirmed });
  } catch (err) {
    return next(err);
  }
});

export default router;
