import { randomUUID } from 'node:crypto';
import { createSupabaseWithUserAccessToken, getSupabaseServiceClient } from '../config/supabase.js';
import { listAdminUserIds } from './accountRepository.js';
import { getPetFeedPost } from './petFeedRepository.js';

const memoryNotifications = [];
const DEFAULT_NOTIFICATION_LIMIT = 50;
const MAX_NOTIFICATION_LIMIT = 100;

const BREEDER_NOTIFICATION_TYPES = new Set(['breeder_verified', 'breeder_rejected']);
const ADMIN_NOTIFICATION_TYPES = new Set([
  'admin_breeder_pending',
  'admin_listing_pending',
  'admin_report_open',
]);
const DEAL_NOTIFICATION_TYPES = new Set([
  'deposit_request',
  'deposit_confirmed',
  'deposit_cancelled',
  'deal_complete_request',
  'deal_completed',
]);
const ADMIN_DEFAULT_CTA = {
  admin_breeder_pending: { label: 'Xem yêu cầu', href: '/app/admin?section=requests&type=breeder' },
  admin_listing_pending: { label: 'Xem yêu cầu', href: '/app/admin?section=requests&type=post' },
  admin_report_open: { label: 'Xem yêu cầu', href: '/app/admin?section=requests&type=report' },
};

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

function normalizeMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...value };
}

async function loadBreederProfileLite(profileId) {
  const safeId = trimText(profileId, 64);
  if (!safeId) return null;
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('breeder_profiles')
    .select('id, display_name, avatar_url')
    .eq('id', safeId)
    .maybeSingle();
  if (error) throw error;
  return data;
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
  const metadata = normalizeMetadata(row.metadata);
  return {
    id: row.id,
    recipient_user_id: row.recipient_user_id,
    actor_user_id: row.actor_user_id,
    post_id: row.post_id ?? null,
    comment_id: row.comment_id ?? null,
    breeder_profile_id: row.breeder_profile_id ?? null,
    type: row.type || 'post_comment',
    body_preview: row.body_preview ?? '',
    metadata,
    created_at: row.created_at,
    read_at: row.read_at ?? null,
    is_unread: !row.read_at,
    actor_display_name: extras.actor_display_name ?? 'Pet Health user',
    post_title: extras.post_title ?? '',
    post_thumb_url: extras.post_thumb_url ?? null,
    breeder_display_name: extras.breeder_display_name ?? '',
    cta_label: extras.cta_label ?? metadata.cta_label ?? '',
    rejection_reason: extras.rejection_reason ?? metadata.rejection_reason ?? '',
    admin_action: extras.admin_action ?? metadata.admin_action ?? '',
    admin_note: extras.admin_note ?? metadata.admin_note ?? '',
  };
}

async function enrichNotification(row, accessToken) {
  const names = await authorDisplayNamesForUserIds([row.actor_user_id]);
  const actorName = names.get(row.actor_user_id) || 'Pet Health user';
  const type = row.type || 'post_comment';

  if (BREEDER_NOTIFICATION_TYPES.has(type)) {
    let breederName = '';
    let thumb = null;
    if (row.breeder_profile_id) {
      try {
        const profile = await loadBreederProfileLite(row.breeder_profile_id);
        breederName = trimText(profile?.display_name, 160);
        thumb = typeof profile?.avatar_url === 'string' ? profile.avatar_url : null;
      } catch {
        // ignore enrichment failures
      }
    }
    const metadata = normalizeMetadata(row.metadata);
    return toNotification(row, {
      actor_display_name: actorName,
      breeder_display_name: breederName,
      post_title: breederName,
      post_thumb_url: thumb,
      cta_label: metadata.cta_label || '',
      rejection_reason: metadata.rejection_reason || '',
      admin_action: metadata.admin_action || '',
      admin_note: metadata.admin_note || '',
    });
  }

  if (ADMIN_NOTIFICATION_TYPES.has(type)) {
    const metadata = normalizeMetadata(row.metadata);
    const defaults = ADMIN_DEFAULT_CTA[type] || ADMIN_DEFAULT_CTA.admin_breeder_pending;
    return toNotification(row, {
      actor_display_name: actorName,
      post_title: trimText(metadata.title || metadata.request_title, 160),
      post_thumb_url: typeof metadata.thumb_url === 'string' ? metadata.thumb_url : null,
      cta_label: metadata.cta_label || defaults.label,
    });
  }

  if (DEAL_NOTIFICATION_TYPES.has(type)) {
    const metadata = normalizeMetadata(row.metadata);
    return toNotification(row, {
      actor_display_name: actorName,
      post_title: trimText(metadata.title, 160),
      post_thumb_url: typeof metadata.thumb_url === 'string' ? metadata.thumb_url : null,
      cta_label: metadata.cta_label || 'Xem bài đăng',
    });
  }

  const post = row.post_id
    ? await getPetFeedPost(row.recipient_user_id, row.post_id, accessToken).catch(() => null)
    : null;
  return toNotification(row, {
    actor_display_name: actorName,
    post_title: post?.title ?? '',
    post_thumb_url: listThumbFromPost(post),
  });
}

/** Soft-deposit / handoff notifications between Sen and Breeder. */
export async function createDealNotification({
  recipientUserId,
  actorUserId,
  postId,
  type,
  bodyPreview,
  metadata = {},
  accessToken,
}) {
  const recipient = trimText(recipientUserId, 64);
  const actor = trimText(actorUserId, 64);
  const safePostId = trimText(postId, 64);
  const safeType = DEAL_NOTIFICATION_TYPES.has(type) ? type : '';
  if (!recipient || !actor || !safePostId || !safeType) return null;
  if (recipient === actor) return null;

  const meta = normalizeMetadata(metadata);
  if (!meta.cta_href) {
    meta.cta_href = `/app/posts/${encodeURIComponent(safePostId)}`;
  }
  if (!meta.cta_label) meta.cta_label = 'Xem bài đăng';

  const row = {
    id: randomUUID(),
    recipient_user_id: recipient,
    actor_user_id: actor,
    post_id: safePostId,
    comment_id: null,
    breeder_profile_id: trimText(metadata?.breeder_profile_id, 64) || null,
    type: safeType,
    body_preview: trimText(bodyPreview, 220),
    metadata: meta,
    created_at: new Date().toISOString(),
    read_at: null,
  };

  const supabase = getNotificationsSupabase(accessToken);
  if (!supabase) {
    memoryNotifications.push(row);
    return enrichNotification(row, accessToken);
  }

  const { data, error } = await supabase.from('pet_feed_notifications').insert(row).select('*').single();
  if (error) throw error;
  return enrichNotification(data, accessToken);
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
    breeder_profile_id: null,
    type: 'post_comment',
    body_preview: trimText(bodyPreview, 160),
    metadata: {},
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

/**
 * Notify a user when admin verifies or rejects their breeder application.
 */
export async function createBreederVerificationNotification({
  recipientUserId,
  actorUserId,
  breederProfileId,
  type,
  bodyPreview,
  metadata = {},
  accessToken,
}) {
  const recipient = trimText(recipientUserId, 64);
  const actor = trimText(actorUserId, 64) || 'admin';
  const profileId = trimText(breederProfileId, 64);
  const safeType = type === 'breeder_rejected' ? 'breeder_rejected' : 'breeder_verified';
  if (!recipient || !profileId) return null;

  const meta = normalizeMetadata(metadata);
  const row = {
    id: randomUUID(),
    recipient_user_id: recipient,
    actor_user_id: actor,
    post_id: null,
    comment_id: null,
    breeder_profile_id: profileId,
    type: safeType,
    body_preview: trimText(bodyPreview, 220),
    metadata: meta,
    created_at: new Date().toISOString(),
    read_at: null,
  };

  const supabase = getNotificationsSupabase(accessToken);
  if (!supabase) {
    memoryNotifications.push(row);
    return enrichNotification(row, accessToken);
  }

  const { data, error } = await supabase.from('pet_feed_notifications').insert(row).select('*').single();
  if (error) throw error;
  return enrichNotification(data, accessToken);
}

/**
 * Fan-out one notification row to every admin when a review queue item arrives.
 * Skips the actor when they are also an admin.
 */
export async function createAdminRequestNotifications({
  actorUserId,
  type,
  bodyPreview,
  metadata = {},
  postId = null,
  breederProfileId = null,
  accessToken,
}) {
  const safeType = ADMIN_NOTIFICATION_TYPES.has(type) ? type : '';
  if (!safeType) return [];

  const actor = trimText(actorUserId, 64);
  const adminIds = await listAdminUserIds().catch(() => []);
  const recipients = [...new Set(adminIds)].filter((id) => id && id !== actor);
  if (!recipients.length) return [];

  const defaults = ADMIN_DEFAULT_CTA[safeType] || ADMIN_DEFAULT_CTA.admin_breeder_pending;
  const safePostId = trimText(postId, 64) || null;
  const safeBreederId = trimText(breederProfileId, 64) || null;
  const reportId = trimText(metadata?.report_id, 64) || null;

  let ctaHref = trimText(metadata?.cta_href, 240) || defaults.href;
  if (safeType === 'admin_breeder_pending' && safeBreederId) {
    ctaHref = `/app/admin?section=requests&type=breeder&focus=${encodeURIComponent(safeBreederId)}`;
  } else if (safeType === 'admin_listing_pending' && safePostId) {
    ctaHref = `/app/admin?section=requests&type=post&focus=${encodeURIComponent(safePostId)}`;
  } else if (safeType === 'admin_report_open' && reportId) {
    ctaHref = `/app/admin?section=requests&type=report&focus=${encodeURIComponent(reportId)}`;
  }

  const meta = {
    ...normalizeMetadata(metadata),
    cta_label: trimText(metadata?.cta_label, 80) || defaults.label,
    cta_href: ctaHref,
    request_kind:
      safeType === 'admin_breeder_pending'
        ? 'breeder'
        : safeType === 'admin_listing_pending'
          ? 'listing'
          : 'report',
  };
  const now = new Date().toISOString();
  const preview = trimText(bodyPreview, 220);

  const rows = recipients.map((recipientUserId) => ({
    id: randomUUID(),
    recipient_user_id: recipientUserId,
    actor_user_id: actor || 'system',
    post_id: safePostId,
    comment_id: null,
    breeder_profile_id: safeBreederId,
    type: safeType,
    body_preview: preview,
    metadata: meta,
    created_at: now,
    read_at: null,
  }));

  const supabase = getNotificationsSupabase(accessToken);
  if (!supabase) {
    memoryNotifications.push(...rows);
    return Promise.all(rows.map((row) => enrichNotification(row, accessToken)));
  }

  const { data, error } = await supabase.from('pet_feed_notifications').insert(rows).select('*');
  if (error) throw error;
  return Promise.all((data ?? []).map((row) => enrichNotification(row, accessToken)));
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
