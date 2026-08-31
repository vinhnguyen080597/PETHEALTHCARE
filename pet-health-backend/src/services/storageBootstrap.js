import {
  getPrivateMediaBucketName,
  getPublicMediaBucketName,
  getSupabaseServiceClient,
} from '../config/supabase.js';

let ensurePromise = null;

function isBucketMissingError(error) {
  const text = String(error?.message || error?.error || error || '');
  return /bucket not found/i.test(text);
}

async function ensureBucket(supabase, bucketName, { public: isPublic }) {
  const { data, error } = await supabase.storage.getBucket(bucketName);
  if (data && !error) return true;

  if (error && !isBucketMissingError(error)) {
    console.warn(`[storage] getBucket(${bucketName}) failed: ${error.message}`);
    return false;
  }

  const { error: createError } = await supabase.storage.createBucket(bucketName, {
    public: isPublic,
  });
  if (createError && !/already exists/i.test(String(createError.message || ''))) {
    console.warn(`[storage] createBucket(${bucketName}) failed: ${createError.message}`);
    return false;
  }
  return true;
}

/**
 * Create private/public media buckets via service role when missing.
 * Storage RLS policies still require the SQL migration in context/migrations.
 */
export async function ensureMediaStorageBuckets() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return false;

  const specs = [
    { name: getPrivateMediaBucketName(), public: false },
    { name: getPublicMediaBucketName(), public: true },
  ];

  let ok = true;
  for (const spec of specs) {
    const created = await ensureBucket(supabase, spec.name, { public: spec.public });
    ok = ok && created;
  }
  return ok;
}

/** Idempotent — safe to call before every upload. */
export function ensureMediaStorageBucketsOnce() {
  if (!ensurePromise) {
    ensurePromise = ensureMediaStorageBuckets().catch((err) => {
      ensurePromise = null;
      console.warn('[storage] ensureMediaStorageBuckets failed:', err?.message || err);
      return false;
    });
  }
  return ensurePromise;
}

export { isBucketMissingError };
