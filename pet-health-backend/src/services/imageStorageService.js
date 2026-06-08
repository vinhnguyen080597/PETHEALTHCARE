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
    lastError = error;
    const canRetry = isStorageRlsError(error) && i < clients.length - 1;
    if (!canRetry) throw error;
  }
  throw lastError;
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

export async function resolvePrivateMediaUrl(value, expiresInSeconds = 86400) {
  const parsed = parseStorageUri(value);
  if (!parsed) return value;
  const supabase = getSupabaseServiceClient();
  if (!supabase) return value;
  const { data, error } = await supabase.storage
    .from(parsed.bucketName)
    .createSignedUrl(parsed.filePath, expiresInSeconds);
  if (error) throw error;
  return data?.signedUrl ?? value;
}

export async function resolvePrivateMediaUrls(values, expiresInSeconds = 86400) {
  if (!Array.isArray(values)) return [];
  return Promise.all(values.map((value) => resolvePrivateMediaUrl(value, expiresInSeconds)));
}
