import { randomUUID } from 'node:crypto';
import { createSupabaseWithUserAccessToken, getSupabaseServiceClient } from '../config/supabase.js';
import { getPetFeedPost, isPetFeedPostOpenForEngagement } from './petFeedRepository.js';
import { createConversationMessageNotification } from './petFeedNotificationsRepository.js';

const memoryConversations = [];
const memoryMessages = [];
const MAX_MESSAGE_BODY = 2000;
const DEFAULT_MESSAGE_LIMIT = 100;
const MAX_MESSAGE_LIMIT = 200;

function getMessagingSupabase(accessToken) {
  // Prefer service role for reliable participant writes; fall back to JWT client.
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

function postSummaryFromPost(post) {
  if (!post) return null;
  return {
    id: post.id,
    title: trimText(post.title, 120) || '',
    thumb_url: listThumbFromPost(post),
    price_note: trimText(post.price_note, 80),
    species: trimText(post.species, 40),
    breed: trimText(post.breed, 80),
    location: trimText(post.location, 80),
    status: post.status ?? 'published',
    created_at: post.created_at ?? null,
    updated_at: post.updated_at ?? null,
  };
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

async function isBreederBlockedBySen(senUserId, breederProfileId, accessToken) {
  if (!senUserId || !breederProfileId) return false;
  const supabase = getMessagingSupabase(accessToken);
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('pet_feed_blocked_breeders')
    .select('breeder_profile_id')
    .eq('user_id', senUserId)
    .eq('breeder_profile_id', breederProfileId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

function toMessage(row) {
  if (!row) return row;
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_user_id: row.sender_user_id,
    body: row.body,
    created_at: row.created_at,
  };
}

function viewerLastReadAt(row, viewerUserId) {
  if (viewerUserId === row.sen_user_id) return row.sen_last_read_at ?? null;
  if (viewerUserId === row.breeder_user_id) return row.breeder_last_read_at ?? null;
  return null;
}

function conversationHasUnread(row, viewerUserId) {
  if (!row?.last_message_at || !row?.last_message_sender_user_id) return false;
  if (row.last_message_sender_user_id === viewerUserId) return false;
  const lastRead = viewerLastReadAt(row, viewerUserId);
  if (!lastRead) return true;
  const lastMessageTime = new Date(row.last_message_at).getTime();
  const lastReadTime = new Date(lastRead).getTime();
  if (!Number.isFinite(lastMessageTime) || !Number.isFinite(lastReadTime)) return true;
  return lastMessageTime > lastReadTime;
}

function toConversation(row, extras = {}) {
  if (!row) return row;
  const viewerUserId = extras.viewer_user_id ?? null;
  return {
    id: row.id,
    post_id: row.post_id,
    sen_user_id: row.sen_user_id,
    breeder_user_id: row.breeder_user_id,
    last_message_at: row.last_message_at ?? null,
    last_message_preview: row.last_message_preview ?? '',
    last_message_sender_user_id: row.last_message_sender_user_id ?? null,
    sen_last_read_at: row.sen_last_read_at ?? null,
    breeder_last_read_at: row.breeder_last_read_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    post_title: extras.post_title ?? '',
    post_thumb_url: extras.post_thumb_url ?? null,
    post_summary: extras.post_summary ?? null,
    peer_display_name: extras.peer_display_name ?? 'Pet Health user',
    peer_user_id: extras.peer_user_id ?? null,
    has_unread: viewerUserId ? conversationHasUnread(row, viewerUserId) : false,
  };
}

async function enrichConversation(row, viewerUserId, accessToken) {
  const post = await getPetFeedPost(viewerUserId, row.post_id, accessToken);
  const peerUserId = viewerUserId === row.sen_user_id ? row.breeder_user_id : row.sen_user_id;
  const names = await authorDisplayNamesForUserIds([peerUserId]);
  return toConversation(row, {
    viewer_user_id: viewerUserId,
    post_title: post?.title ?? '',
    post_thumb_url: listThumbFromPost(post),
    post_summary: postSummaryFromPost(post),
    peer_display_name: names.get(peerUserId) || 'Pet Health user',
    peer_user_id: peerUserId,
  });
}

export async function openPetFeedConversation(userId, postId, accessToken) {
  const safePostId = trimText(postId, 64);
  if (!safePostId) {
    const err = new Error('postId is required');
    err.status = 400;
    err.code = 'MISSING_POST_ID';
    throw err;
  }
  const post = await getPetFeedPost(userId, safePostId, accessToken);
  if (!post || !isPetFeedPostOpenForEngagement(post) || post.post_kind === 'announcement') {
    const err = new Error('Pet feed post not found');
    err.status = 404;
    err.code = 'PET_FEED_POST_NOT_FOUND';
    throw err;
  }
  if (post.user_id === userId) {
    const err = new Error('You cannot message your own listing.');
    err.status = 400;
    err.code = 'PET_FEED_MESSAGE_SELF';
    throw err;
  }
  if (post.breeder_profile_id && (await isBreederBlockedBySen(userId, post.breeder_profile_id, accessToken))) {
    const err = new Error('This breeder is hidden from your Pet Feed.');
    err.status = 403;
    err.code = 'PET_FEED_BREEDER_BLOCKED';
    throw err;
  }

  const supabase = getMessagingSupabase(accessToken);
  if (!supabase) {
    let existing = memoryConversations.find((row) => row.post_id === safePostId && row.sen_user_id === userId);
    if (!existing) {
      const now = new Date().toISOString();
      existing = {
        id: randomUUID(),
        post_id: safePostId,
        sen_user_id: userId,
        breeder_user_id: post.user_id,
        last_message_at: null,
        last_message_preview: '',
        last_message_sender_user_id: null,
        sen_last_read_at: null,
        breeder_last_read_at: null,
        created_at: now,
        updated_at: now,
      };
      memoryConversations.push(existing);
    }
    return enrichConversation(existing, userId, accessToken);
  }

  const { data: existing, error: findError } = await supabase
    .from('pet_feed_conversations')
    .select('*')
    .eq('post_id', safePostId)
    .eq('sen_user_id', userId)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return enrichConversation(existing, userId, accessToken);

  const now = new Date().toISOString();
  const row = {
    id: randomUUID(),
    post_id: safePostId,
    sen_user_id: userId,
    breeder_user_id: post.user_id,
    last_message_at: null,
    last_message_preview: '',
    last_message_sender_user_id: null,
    sen_last_read_at: null,
    breeder_last_read_at: null,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await supabase.from('pet_feed_conversations').insert(row).select('*').single();
  if (error) {
    // Race: another request created the same unique (post_id, sen_user_id).
    if (error.code === '23505') {
      const { data: raced, error: racedError } = await supabase
        .from('pet_feed_conversations')
        .select('*')
        .eq('post_id', safePostId)
        .eq('sen_user_id', userId)
        .maybeSingle();
      if (racedError) throw racedError;
      if (raced) return enrichConversation(raced, userId, accessToken);
    }
    throw error;
  }
  return enrichConversation(data, userId, accessToken);
}

export async function listPetFeedConversations(userId, accessToken) {
  const supabase = getMessagingSupabase(accessToken);
  if (!supabase) {
    const rows = memoryConversations
      .filter((row) => row.sen_user_id === userId || row.breeder_user_id === userId)
      .sort((a, b) => String(b.last_message_at || b.updated_at).localeCompare(String(a.last_message_at || a.updated_at)));
    return Promise.all(rows.map((row) => enrichConversation(row, userId, accessToken)));
  }
  const { data, error } = await supabase
    .from('pet_feed_conversations')
    .select('*')
    .or(`sen_user_id.eq.${userId},breeder_user_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map((row) => enrichConversation(row, userId, accessToken)));
}

async function getConversationRowForParticipant(userId, conversationId, accessToken) {
  const safeId = trimText(conversationId, 64);
  if (!safeId) {
    const err = new Error('conversationId is required');
    err.status = 400;
    err.code = 'MISSING_CONVERSATION_ID';
    throw err;
  }
  const supabase = getMessagingSupabase(accessToken);
  if (!supabase) {
    const row = memoryConversations.find((item) => item.id === safeId) ?? null;
    if (!row || (row.sen_user_id !== userId && row.breeder_user_id !== userId)) {
      const err = new Error('Conversation not found');
      err.status = 404;
      err.code = 'PET_FEED_CONVERSATION_NOT_FOUND';
      throw err;
    }
    return row;
  }
  const { data, error } = await supabase.from('pet_feed_conversations').select('*').eq('id', safeId).maybeSingle();
  if (error) throw error;
  if (!data || (data.sen_user_id !== userId && data.breeder_user_id !== userId)) {
    const err = new Error('Conversation not found');
    err.status = 404;
    err.code = 'PET_FEED_CONVERSATION_NOT_FOUND';
    throw err;
  }
  return data;
}

export async function getPetFeedConversation(userId, conversationId, accessToken) {
  const row = await getConversationRowForParticipant(userId, conversationId, accessToken);
  return enrichConversation(row, userId, accessToken);
}

export async function markPetFeedConversationRead(userId, conversationId, accessToken) {
  const row = await getConversationRowForParticipant(userId, conversationId, accessToken);
  const now = new Date().toISOString();
  const patch = userId === row.sen_user_id
    ? { sen_last_read_at: now, updated_at: now }
    : { breeder_last_read_at: now, updated_at: now };
  const supabase = getMessagingSupabase(accessToken);
  if (!supabase) {
    const idx = memoryConversations.findIndex((item) => item.id === row.id);
    if (idx >= 0) {
      memoryConversations[idx] = { ...memoryConversations[idx], ...patch };
      return enrichConversation(memoryConversations[idx], userId, accessToken);
    }
    return enrichConversation({ ...row, ...patch }, userId, accessToken);
  }
  const { data, error } = await supabase
    .from('pet_feed_conversations')
    .update(patch)
    .eq('id', row.id)
    .select('*')
    .single();
  if (error) throw error;
  return enrichConversation(data, userId, accessToken);
}

export async function listPetFeedConversationMessages(userId, conversationId, accessToken, options = {}) {
  const row = await getConversationRowForParticipant(userId, conversationId, accessToken);
  const limit = Math.min(Math.max(Number(options.limit) || DEFAULT_MESSAGE_LIMIT, 1), MAX_MESSAGE_LIMIT);
  const supabase = getMessagingSupabase(accessToken);
  const markRead = options.markRead !== false;
  if (!supabase) {
    const messages = memoryMessages
      .filter((item) => item.conversation_id === row.id)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .slice(0, limit)
      .map(toMessage);
    if (markRead) {
      await markPetFeedConversationRead(userId, conversationId, accessToken);
    }
    return messages;
  }
  const { data, error } = await supabase
    .from('pet_feed_messages')
    .select('*')
    .eq('conversation_id', row.id)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  if (markRead) {
    await markPetFeedConversationRead(userId, conversationId, accessToken);
  }
  return (data ?? []).map(toMessage);
}

export async function sendPetFeedConversationMessage(userId, conversationId, body, accessToken) {
  const row = await getConversationRowForParticipant(userId, conversationId, accessToken);
  const trimmed = trimText(body, MAX_MESSAGE_BODY);
  if (!trimmed) {
    const err = new Error('Message cannot be empty.');
    err.status = 400;
    err.code = 'PET_FEED_MESSAGE_EMPTY';
    throw err;
  }

  const post = await getPetFeedPost(userId, row.post_id, accessToken);
  if (post?.breeder_profile_id && row.sen_user_id === userId) {
    if (await isBreederBlockedBySen(userId, post.breeder_profile_id, accessToken)) {
      const err = new Error('This breeder is hidden from your Pet Feed.');
      err.status = 403;
      err.code = 'PET_FEED_BREEDER_BLOCKED';
      throw err;
    }
  }

  const now = new Date().toISOString();
  const message = {
    id: randomUUID(),
    conversation_id: row.id,
    sender_user_id: userId,
    body: trimmed,
    created_at: now,
  };
  const supabase = getMessagingSupabase(accessToken);
  const conversationPatch = {
    last_message_at: now,
    last_message_preview: trimmed.slice(0, 160),
    last_message_sender_user_id: userId,
    updated_at: now,
    ...(userId === row.sen_user_id ? { sen_last_read_at: now } : { breeder_last_read_at: now }),
  };

  if (!supabase) {
    memoryMessages.push(message);
    const idx = memoryConversations.findIndex((item) => item.id === row.id);
    if (idx >= 0) {
      memoryConversations[idx] = {
        ...memoryConversations[idx],
        ...conversationPatch,
      };
    }
    const recipientUserId =
      userId === row.sen_user_id ? row.breeder_user_id : row.sen_user_id;
    void createConversationMessageNotification({
      recipientUserId,
      actorUserId: userId,
      postId: row.post_id,
      conversationId: row.id,
      messageId: message.id,
      bodyPreview: trimmed,
      accessToken,
    }).catch(() => null);
    return toMessage(message);
  }

  const { data, error } = await supabase.from('pet_feed_messages').insert(message).select('*').single();
  if (error) throw error;
  const { error: updateError } = await supabase
    .from('pet_feed_conversations')
    .update(conversationPatch)
    .eq('id', row.id);
  if (updateError) throw updateError;
  const recipientUserId =
    userId === row.sen_user_id ? row.breeder_user_id : row.sen_user_id;
  void createConversationMessageNotification({
    recipientUserId,
    actorUserId: userId,
    postId: row.post_id,
    conversationId: row.id,
    messageId: data.id,
    bodyPreview: trimmed,
    accessToken,
  }).catch(() => null);
  return toMessage(data);
}
