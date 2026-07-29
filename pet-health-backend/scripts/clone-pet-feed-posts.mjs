/**
 * Clone Pet Feed listing posts for dev/demo seeding.
 *
 * Usage (from pet-health-backend):
 *   node scripts/clone-pet-feed-posts.mjs [--count=7] [--user-id=<id>]
 */
import { randomUUID } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv();

const CLONE_COUNT = parsePositiveInt(process.argv.find((arg) => arg.startsWith('--count='))?.split('=')[1], 7);
const USER_ID_ARG = process.argv.find((arg) => arg.startsWith('--user-id='))?.split('=')[1]?.trim() || '';

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function pickCloneFields(post) {
  return {
    user_id: post.user_id,
    breeder_profile_id: post.breeder_profile_id,
    title: post.title,
    species: post.species,
    breed: post.breed,
    gender: post.gender,
    age_months: post.age_months,
    location: post.location,
    price_note: post.price_note,
    description: post.description,
    personality: post.personality ?? [],
    vaccine_status: post.vaccine_status,
    deworming_status: post.deworming_status,
    paperwork: post.paperwork ?? [],
    media_urls: post.media_urls ?? [],
    video_url: post.video_url,
    contact: post.contact ?? {},
    status: post.status,
    metadata: post.metadata ?? {},
    post_kind: post.post_kind ?? 'listing',
  };
}

function cloneTitle(baseTitle, index) {
  const trimmed = String(baseTitle || 'Listing').trim();
  return `${trimmed} (bản ${index + 1})`.slice(0, 120);
}

function staggerCreatedAt(sourceIso, cloneIndex) {
  const sourceMs = new Date(sourceIso).getTime();
  const base = Number.isFinite(sourceMs) ? sourceMs : Date.now();
  const minutesAgo = cloneIndex * 17 + 3;
  return new Date(base - minutesAgo * 60_000).toISOString();
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let query = supabase
    .from('pet_feed_posts')
    .select('*')
    .eq('post_kind', 'listing')
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  if (USER_ID_ARG) query = query.eq('user_id', USER_ID_ARG);

  const { data: posts, error } = await query;
  if (error) throw error;

  const templates = (posts ?? []).slice(0, 3);
  if (templates.length === 0) {
    throw new Error('No active listing posts found to clone.');
  }

  const clones = [];
  for (let i = 0; i < CLONE_COUNT; i += 1) {
    const template = templates[i % templates.length];
    const nowIso = new Date().toISOString();
    clones.push({
      id: randomUUID(),
      ...pickCloneFields(template),
      title: cloneTitle(template.title, i),
      created_at: staggerCreatedAt(template.created_at, i),
      updated_at: nowIso,
    });
  }

  const { data: inserted, error: insertError } = await supabase
    .from('pet_feed_posts')
    .insert(clones)
    .select('id, title, status, user_id, created_at');

  if (insertError) throw insertError;

  console.log(`Cloned ${inserted.length} posts from ${templates.length} template(s):`);
  for (const row of inserted) {
    console.log(`- ${row.id} | ${row.status} | ${row.title}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
