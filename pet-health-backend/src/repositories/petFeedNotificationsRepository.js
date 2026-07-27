import { randomUUID } from 'node:crypto';
import { createSupabaseWithUserAccessToken, getSupabaseServiceClient } from '../config/supabase.js';
import { getPetFeedPost } from './petFeedRepository.js';

const memoryNotifications = [];
const DEFAULT_NOTIFICATION_LIMIT = 50;
const MAX_NOTIFICATION_LIMIT = 100;

function getNotificationsSupabase(accessToken) {
  return getSupabaseServiceClient() ?? createSupabaseWithUserAccessToken(accessToken);
}

function trimText(value, max = 2000) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function listThumbFromPost(post) {
  if (!post) return null;
  const metaThumb =
    post.metadata && typeof post.metadata.list_thumb_url === 'string' ? post.metadata.list_thumb_url.trim() : '';
  if (metaThumb) return metaThumb;
  const media = Array.isArray(post.media_urls) ? post.media_urls.filter(Boolean) : [];
  return media[0] || null;
}

async function authorDisplayNamesForUserIds(userIds) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return new Map(unique.map((id) => [id, 'Pet Health user']));
  }
  const { data, error } = await supabase.from('app_user_profiles').select('user_id, display_name').in('user_id', unique);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.user_id, trimText(row.display_name, 160) || 'Pet Health user']));
}

function toNotification(row, extras = {}) {
  if (!row) return row;
  return {
    id: row.id,
    recipient_user_id: row.recipient_user_id,
    actor_user_id: row.actor_user_id,
    post_id: row.post_id,
    comment_id: row.comment_id,
    type: row.type || 'post_comment',
    body_preview: row.body_preview ?? '',
    created_at: row.created_at,
    read_at: row.read_at ?? null,
    is_unread: !row.read_at,
    actor_display_name: extras.actor_display_name ?? 'Pet Health user',
    post_title: extras.post_title ?? '',
    post_thumb_url: extras.post_thumb_url ?? null,
  };
}

async function enrichNotification(row, accessToken) {
  const [names, post] = await Promise.all([
    authorDisplayNamesForUserIds([row.actor_user_id]),
    getPetFeedPost(row.recipient_user_id, row.post_id, accessToken).catch(() => null),
  ]);
  return toNotification(row, {
    actor_display_name: names.get(row.actor_user_id) || 'Pet Health user',
    post_title: post?.title ?? '',
    post_thumb_url: listThumbFromPost(post),
  });
}

/**
 * Create a notification for the post owner when someone else comments.
 * No-ops when the actor owns the post.
 */
export async function createPostCommentNotification({
  recipientUserId,
  actorUserId,
  postId,
  commentId,
  bodyPreview,
  accessToken,
}) {
  const recipient = trimText(recipientUserId, 64);
  const actor = trimText(actorUserId, 64);
  const safePostId = trimText(postId, 64);
  const safeCommentId = trimText(commentId, 64);
  if (!recipient || !actor || !safePostId || !safeCommentId) return null;
  if (recipient === actor) return null;

  const row = {
    id: randomUUID(),
    recipient_user_id: recipient,
    actor_user_id: actor,
    post_id: safePostId,
    comment_id: safeCommentId,
    type: 'post_comment',
    body_preview: trimText(bodyPreview, 160),
    created_at: new Date().toISOString(),
    read_at: null,
  };

  const supabase = getNotificationsSupabase(accessToken);
  if (!supabase) {
    const existing = memoryNotifications.find((item) => item.comment_id === safeCommentId);
    if (existing) return enrichNotification(existing, accessToken);
    memoryNotifications.push(row);
    return enrichNotification(row, accessToken);
  }

  const { data, error } = await supabase.from('pet_feed_notifications').insert(row).select('*').single();
  if (error) {
    // Unique comment_id race / duplicate.
    if (error.code === '23505') {
      const { data: existing, error: existingError } = await supabase
        .from('pet_feed_notifications')
        .select('*')
        .eq('comment_id', safeCommentId)
        .maybeSingle();
      if (existingError) throw existingError;
      return existing ? enrichNotification(existing, accessToken) : null;
    }
    throw error;
  }
  return enrichNotification(data, accessToken);
}

export async function listPetFeedNotifications(userId, accessToken, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || DEFAULT_NOTIFICATION_LIMIT, 1), MAX_NOTIFICATION_LIMIT);
  const supabase = getNotificationsSupabase(accessToken);
  if (!supabase) {
    const rows = memoryNotifications
      .filter((row) => row.recipient_user_id === userId)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, limit);
    return Promise.all(rows.map((row) => enrichNotification(row, accessToken)));
  }

  const { data, error } = await supabase
    .from('pet_feed_notifications')
    .select('*')
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return Promise.all((data ?? []).map((row) => enrichNotification(row, accessToken)));
}

export async function countUnreadPetFeedNotifications(userId, accessToken) {
  const supabase = getNotificationsSupabase(accessToken);
  if (!supabase) {
    return memoryNotifications.filter((row) => row.recipient_user_id === userId && !row.read_at).length;
  }
  const { count, error } = await supabase
    .from('pet_feed_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_user_id', userId)
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markPetFeedNotificationsRead(userId, accessToken, options = {}) {
  const now = new Date().toISOString();
  const ids = Array.isArray(options.ids)
    ? options.ids.map((id) => trimText(id, 64)).filter(Boolean)
    : null;
  const supabase = getNotificationsSupabase(accessToken);

  if (!supabase) {
    let updated = 0;
    memoryNotifications.forEach((row, index) => {
      if (row.recipient_user_id !== userId || row.read_at) return;
      if (ids && !ids.includes(row.id)) return;
      memoryNotifications[index] = { ...row, read_at: now };
      updated += 1;
    });
    return { updated };
  }

  let query = supabase
    .from('pet_feed_notifications')
    .update({ read_at: now })
    .eq('recipient_user_id', userId)
    .is('read_at', null);
  if (ids?.length) {
    query = query.in('id', ids);
  }
  const { data, error } = await query.select('id');
  if (error) throw error;
  return { updated: (data ?? []).length };
}

/** Test helper: clear in-memory store. */
export function __resetPetFeedNotificationsMemoryForTests() {
  memoryNotifications.length = 0;
}
