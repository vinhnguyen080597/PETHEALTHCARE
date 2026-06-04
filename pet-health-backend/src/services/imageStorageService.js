import { randomUUID } from 'node:crypto';
import {
  createSupabaseWithUserAccessToken,
  getImageBucketName,
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

async function uploadToImageBucket({ accessToken, filePath, buffer, contentType }) {
  const bucketName = getImageBucketName();
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
      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      return data.publicUrl;
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
  const bucketName = getImageBucketName();

  const publicUrl = await uploadToImageBucket({
    accessToken,
    filePath,
    buffer: file.buffer,
    contentType: file.mimetype,
  });
  if (publicUrl) return publicUrl;

  memoryImages.set(filePath, file.buffer);
  return `memory://${bucketName}/${filePath}`;
}

/** Pet Feed photos — same bucket, path `userId/pet-feed/photos/...` for listing media. */
export async function storePetFeedImage({ userId, file, accessToken }) {
  const extension = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `${userId}/pet-feed/photos/${Date.now()}-${randomUUID()}.${extension}`;
  const bucketName = getImageBucketName();

  const publicUrl = await uploadToImageBucket({
    accessToken,
    filePath,
    buffer: file.buffer,
    contentType: file.mimetype,
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
  const bucketName = getImageBucketName();

  const publicUrl = await uploadToImageBucket({
    accessToken,
    filePath,
    buffer: file.buffer,
    contentType: file.mimetype,
  });
  if (publicUrl) return publicUrl;

  memoryImages.set(filePath, file.buffer);
  return `memory://${bucketName}/${filePath}`;
}

/** Pet Feed video — same bucket, path `userId/pet-feed/videos/...` for listing preview clips. */
export async function storePetFeedVideo({ userId, file, accessToken }) {
  const extension = videoExtension(file.mimetype);
  const filePath = `${userId}/pet-feed/videos/${Date.now()}-${randomUUID()}.${extension}`;
  const bucketName = getImageBucketName();

  const publicUrl = await uploadToImageBucket({
    accessToken,
    filePath,
    buffer: file.buffer,
    contentType: file.mimetype,
  });
  if (publicUrl) return publicUrl;

  memoryImages.set(filePath, file.buffer);
  return `memory://${bucketName}/${filePath}`;
}

/** Pet profile photos — same bucket, path `userId/avatars/...` (public URL for `avatar_url`). */
export async function storePetAvatar({ userId, file, accessToken }) {
  const extension = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `${userId}/avatars/${Date.now()}-${randomUUID()}.${extension}`;
  const bucketName = getImageBucketName();

  const publicUrl = await uploadToImageBucket({
    accessToken,
    filePath,
    buffer: file.buffer,
    contentType: file.mimetype,
  });
  if (publicUrl) return publicUrl;

  memoryImages.set(filePath, file.buffer);
  return `memory://${bucketName}/${filePath}`;
}
