import { randomUUID } from 'node:crypto';
import { getImageBucketName, getSupabaseServiceClient } from '../config/supabase.js';

const memoryImages = new Map();

export async function storeDiagnosisImage({ userId, petId, file }) {
  const extension = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `${userId}/${petId}/${Date.now()}-${randomUUID()}.${extension}`;
  const bucketName = getImageBucketName();
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    memoryImages.set(filePath, file.buffer);
    return `memory://${bucketName}/${filePath}`;
  }

  const { error } = await supabase.storage.from(bucketName).upload(filePath, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl;
}
