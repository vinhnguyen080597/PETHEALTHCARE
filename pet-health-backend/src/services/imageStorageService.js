import { randomUUID } from 'node:crypto';
import {
  createSupabaseWithUserAccessToken,
  getImageBucketName,
  getPrivateMediaBucketName,
  getPublicMediaBucketName,
  getSupabaseServiceClient,
  parseSupabaseKeyRole,
} from '../config/supabase.js';

const memoryImages = new Map();

function isStorageRlsError(error) {
  if (!error) return false;
  const msg = String(error.message ?? '');
  return /row-level security|RLS|violates row-level security policy/i.test(msg) || String(error.code ?? '') === '42501';
}

/** Service role bypasses storage RLS; anon key does not — then we need the user's JWT + storage policies. */
function getSupabaseClientsForImageUpload(accessToken) {
  const clients = [];
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (parseSupabaseKeyRole(serviceKey) === 'service_role') {
    const svc = getSupabaseServiceClient();
    if (svc) clients.push(svc);
  }
  const token = typeof accessToken === 'string' ? accessToken.trim() : '';
  const userScoped = token ? createSupabaseWithUserAccessToken(token) : null;
  if (userScoped) clients.push(userScoped);
  return clients;
}

function storageUri(bucketName, filePath) {
  return `storage://${bucketName}/${filePath}`;
}

function parseStorageUri(value) {
  if (typeof value !== 'string' || !value.startsWith('storage://')) return null;
  const rest = value.slice('storage://'.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  return {
    bucketName: rest.slice(0, slash),
    filePath: rest.slice(slash + 1),
  };
}

function mapStorageUploadError(error) {
  const text = String(error?.message || error?.error || error || '');
  if (/exceeded the maximum allowed size|EntityTooLarge|Payload too large|maximum allowed size/i.test(text)) {
    const mapped = new Error(
      'Uploaded file is too large for storage. Use a shorter/lower-quality video (max 50MB) or a smaller photo.',
    );
    mapped.status = 400;
    mapped.code = 'MEDIA_TOO_LARGE';
    return mapped;
  }
  return error;
}

async function uploadToImageBucket({ accessToken, bucketName, filePath, buffer, contentType, publicRead }) {
  const clients = getSupabaseClientsForImageUpload(accessToken);
  if (clients.length === 0) return null;

  let lastError = null;
  for (let i = 0; i < clients.length; i++) {
    const supabase = clients[i];
    const { error } = await supabase.storage.from(bucketName).upload(filePath, buffer, {
      contentType,
      upsert: false,
    });
    if (!error) {
      if (publicRead) {
        const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
        return data.publicUrl;
      }
      return storageUri(bucketName, filePath);
    }
    lastError = mapStorageUploadError(error);
    const canRetry = isStorageRlsError(error) && i < clients.length - 1;
    if (!canRetry) throw lastError;
  }
  throw mapStorageUploadError(lastError);
}

export async function storeDiagnosisImage({ userId, petId, file, accessToken }) {
  const extension = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `${userId}/${petId}/${Date.now()}-${randomUUID()}.${extension}`;
  const bucketName = getPrivateMediaBucketName();

  const storedUrl = await uploadToImageBucket({
    accessToken,
    bucketName,
    filePath,
    buffer: file.buffer,
    contentType: file.mimetype,
    publicRead: false,
  });
  if (storedUrl) return storedUrl;

  memoryImages.set(filePath, file.buffer);
  return `memory://${bucketName}/${filePath}`;
}

/** Pet Feed photos — same bucket, path `userId/pet-feed/photos/...` for listing media. */
export async function storePetFeedImage({ userId, file, accessToken }) {
  const extension = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `${userId}/pet-feed/photos/${Date.now()}-${randomUUID()}.${extension}`;
  const bucketName = getPublicMediaBucketName();

  const publicUrl = await uploadToImageBucket({
    accessToken,
    bucketName,
    filePath,
    buffer: file.buffer,
    contentType: file.mimetype,
    publicRead: true,
  });
  if (publicUrl) return publicUrl;

  memoryImages.set(filePath, file.buffer);
  return `memory://${bucketName}/${filePath}`;
}

/** Feed-card thumbs — path `userId/pet-feed/thumbs/...` (must match ownership checks). */
export async function storePetFeedThumb({ userId, file, accessToken }) {
  const extension = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `${userId}/pet-feed/thumbs/${Date.now()}-${randomUUID()}.${extension}`;
  const bucketName = getPublicMediaBucketName();

  const publicUrl = await uploadToImageBucket({
    accessToken,
    bucketName,
    filePath,
    buffer: file.buffer,
    contentType: file.mimetype,
    publicRead: true,
  });
  if (publicUrl) return publicUrl;

  memoryImages.set(filePath, file.buffer);
  return `memory://${bucketName}/${filePath}`;
}

function videoExtension(mimetype) {
  if (mimetype === 'video/webm') return 'webm';
  if (mimetype === 'video/quicktime') return 'mov';
  if (mimetype === 'video/3gpp') return '3gp';
  return 'mp4';
}

/** Short health-check clips — same bucket, path `userId/petId/videos/...` (≤10s / ≤10MB enforced in route). */
export async function storeDiagnosisVideo({ userId, petId, file, accessToken }) {
  const extension = videoExtension(file.mimetype);
  const filePath = `${userId}/${petId}/videos/${Date.now()}-${randomUUID()}.${extension}`;
  const bucketName = getPrivateMediaBucketName();

  const storedUrl = await uploadToImageBucket({
    accessToken,
    bucketName,
    filePath,
    buffer: file.buffer,
    contentType: file.mimetype,
    publicRead: false,
  });
  if (storedUrl) return storedUrl;

  memoryImages.set(filePath, file.buffer);
  return `memory://${bucketName}/${filePath}`;
}

/** Pet Feed video — same bucket, path `userId/pet-feed/videos/...` for listing preview clips. */
export async function storePetFeedVideo({ userId, file, accessToken }) {
  const extension = videoExtension(file.mimetype);
  const filePath = `${userId}/pet-feed/videos/${Date.now()}-${randomUUID()}.${extension}`;
  const bucketName = getPublicMediaBucketName();

  const publicUrl = await uploadToImageBucket({
    accessToken,
    bucketName,
    filePath,
    buffer: file.buffer,
    contentType: file.mimetype,
    publicRead: true,
  });
  if (publicUrl) return publicUrl;

  memoryImages.set(filePath, file.buffer);
  return `memory://${bucketName}/${filePath}`;
}

const PET_FEED_SIGNED_KINDS = new Set(['photo', 'video', 'thumb']);

function petFeedSignedFolder(kind) {
  if (kind === 'video') return 'videos';
  if (kind === 'thumb') return 'thumbs';
  return 'photos';
}

function photoExtension(mimetype) {
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/webp') return 'webp';
  return 'jpg';
}

/**
 * Mint a short-lived signed upload URL so the client can PUT bytes directly to Supabase Storage.
 * Requires service role. Returns null when storage is unavailable (caller should fallback to multipart).
 */
export async function createPetFeedSignedUpload({ userId, kind, contentType }) {
  const safeUserId = typeof userId === 'string' ? userId.trim() : '';
  const safeKind = typeof kind === 'string' ? kind.trim().toLowerCase() : '';
  const mime = typeof contentType === 'string' ? contentType.trim().toLowerCase() : '';
  if (!safeUserId || !PET_FEED_SIGNED_KINDS.has(safeKind) || !mime) return null;

  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  const isVideo = safeKind === 'video';
  const extension = isVideo ? videoExtension(mime) : photoExtension(mime);
  const filePath = `${safeUserId}/pet-feed/${petFeedSignedFolder(safeKind)}/${Date.now()}-${randomUUID()}.${extension}`;
  const bucketName = getPublicMediaBucketName();

  const { data, error } = await supabase.storage.from(bucketName).createSignedUploadUrl(filePath);
  if (error || !data?.signedUrl || !data?.token) {
    throw error ?? new Error('Failed to create signed upload URL');
  }

  const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return {
    bucket: bucketName,
    path: filePath,
    token: data.token,
    signedUrl: data.signedUrl,
    publicUrl: publicData?.publicUrl ?? null,
    contentType: mime,
  };
}

/**
 * Ensure a public media URL was uploaded under this user's pet-feed path in the public bucket.
 */
export function isOwnedPetFeedPublicMediaUrl(userId, url, kind = 'photo') {
  const safeUserId = typeof userId === 'string' ? userId.trim() : '';
  const value = typeof url === 'string' ? url.trim() : '';
  if (!safeUserId || !value) return false;

  const folder = petFeedSignedFolder(kind === 'video' ? 'video' : kind === 'thumb' ? 'thumb' : 'photo');
  const expectedPrefix = `${safeUserId}/pet-feed/${folder}/`;
  const bucket = getPublicMediaBucketName();

  if (value.startsWith('memory://')) {
    const rest = value.slice('memory://'.length);
    return rest === `${bucket}/${expectedPrefix}` || rest.startsWith(`${bucket}/${expectedPrefix}`);
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = parsed.pathname.indexOf(marker);
    if (idx < 0) return false;
    const objectPath = decodeURIComponent(parsed.pathname.slice(idx + marker.length));
    return objectPath.startsWith(expectedPrefix);
  } catch {
    return false;
  }
}

/** Pet profile photos — same bucket, path `userId/avatars/...` (public URL for `avatar_url`). */
export async function storePetAvatar({ userId, file, accessToken }) {
  const extension = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `${userId}/avatars/${Date.now()}-${randomUUID()}.${extension}`;
  const bucketName = getPrivateMediaBucketName();

  const storedUrl = await uploadToImageBucket({
    accessToken,
    bucketName,
    filePath,
    buffer: file.buffer,
    contentType: file.mimetype,
    publicRead: false,
  });
  if (storedUrl) return storedUrl;

  memoryImages.set(filePath, file.buffer);
  return `memory://${bucketName}/${filePath}`;
}

async function listStorageObjectPaths(bucket, prefix) {
  const paths = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await bucket.list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    const entries = data ?? [];
    if (entries.length === 0) break;

    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id || entry.metadata) {
        paths.push(path);
      } else {
        paths.push(...(await listStorageObjectPaths(bucket, path)));
      }
    }

    if (entries.length < limit) break;
    offset += limit;
  }

  return paths;
}

export async function deleteUserImageStorage(userId) {
  const safeUserId = typeof userId === 'string' ? userId.trim() : '';
  if (!safeUserId) return { deleted: 0 };

  for (const key of [...memoryImages.keys()]) {
    if (key === safeUserId || key.startsWith(`${safeUserId}/`)) {
      memoryImages.delete(key);
    }
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) return { deleted: 0 };

  const bucketNames = [
    ...new Set([getPrivateMediaBucketName(), getPublicMediaBucketName(), getImageBucketName(), process.env.SUPABASE_IMAGE_BUCKET].filter(Boolean)),
  ];
  let deleted = 0;
  for (const bucketName of bucketNames) {
    const bucket = supabase.storage.from(bucketName);
    const paths = await listStorageObjectPaths(bucket, safeUserId);
    if (paths.length === 0) continue;

    for (let i = 0; i < paths.length; i += 1000) {
      const { error } = await bucket.remove(paths.slice(i, i + 1000));
      if (error) throw error;
    }
    deleted += paths.length;
  }
  return { deleted };
}

const SIGNED_URL_CACHE_SKEW_MS = 60_000;
/** @type {Map<string, { url: string, expiresAt: number }>} */
const signedUrlCache = new Map();

function getCachedSignedUrl(storageKey) {
  const entry = signedUrlCache.get(storageKey);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt - SIGNED_URL_CACHE_SKEW_MS) {
    signedUrlCache.delete(storageKey);
    return null;
  }
  return entry.url;
}

function setCachedSignedUrl(storageKey, url, expiresInSeconds) {
  signedUrlCache.set(storageKey, {
    url,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  });
}

export async function resolvePrivateMediaUrl(value, expiresInSeconds = 86400) {
  const parsed = parseStorageUri(value);
  if (!parsed) return value;
  const cached = getCachedSignedUrl(value);
  if (cached) return cached;
  const supabase = getSupabaseServiceClient();
  if (!supabase) return value;
  const { data, error } = await supabase.storage
    .from(parsed.bucketName)
    .createSignedUrl(parsed.filePath, expiresInSeconds);
  if (error) throw error;
  const signedUrl = data?.signedUrl ?? value;
  if (signedUrl && signedUrl !== value) {
    setCachedSignedUrl(value, signedUrl, expiresInSeconds);
  }
  return signedUrl;
}

/**
 * Batch-sign storage:// URIs (grouped by bucket). Non-storage values pass through.
 * Preserves input order.
 */
export async function resolvePrivateMediaUrls(values, expiresInSeconds = 86400) {
  if (!Array.isArray(values) || values.length === 0) return [];

  const results = values.map((value) => value);
  /** @type {Map<string, Array<{ index: number, filePath: string, storageKey: string }>>} */
  const byBucket = new Map();

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    const parsed = parseStorageUri(value);
    if (!parsed) continue;
    const cached = getCachedSignedUrl(value);
    if (cached) {
      results[i] = cached;
      continue;
    }
    const list = byBucket.get(parsed.bucketName) ?? [];
    list.push({ index: i, filePath: parsed.filePath, storageKey: value });
    byBucket.set(parsed.bucketName, list);
  }

  if (byBucket.size === 0) return results;

  const supabase = getSupabaseServiceClient();
  if (!supabase) return results;

  await Promise.all(
    [...byBucket.entries()].map(async ([bucketName, items]) => {
      const paths = items.map((item) => item.filePath);
      const { data, error } = await supabase.storage.from(bucketName).createSignedUrls(paths, expiresInSeconds);
      if (error) throw error;
      const signedByPath = new Map();
      for (const row of data ?? []) {
        if (row?.path && row?.signedUrl) signedByPath.set(row.path, row.signedUrl);
      }
      for (const item of items) {
        const signedUrl = signedByPath.get(item.filePath);
        if (!signedUrl) continue;
        results[item.index] = signedUrl;
        setCachedSignedUrl(item.storageKey, signedUrl, expiresInSeconds);
      }
    }),
  );

  return results;
}
