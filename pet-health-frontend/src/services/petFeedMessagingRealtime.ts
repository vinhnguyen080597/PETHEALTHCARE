import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';
import type { PetFeedConversation, PetFeedMessage } from '../types';

let sharedClient: SupabaseClient | null = null;
let currentAccessToken = '';

export function isPetFeedMessagingRealtimeConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function getClient(accessToken: string): SupabaseClient | null {
  if (!isPetFeedMessagingRealtimeConfigured() || !accessToken) return null;
  currentAccessToken = accessToken;
  if (!sharedClient) {
    // accessToken callback keeps Realtime WS authenticated for RLS (setAuth alone can race).
    sharedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      accessToken: async () => currentAccessToken,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  sharedClient.realtime.setAuth(accessToken);
  return sharedClient;
}

function toMessage(row: Record<string, unknown>): PetFeedMessage | null {
  const id = typeof row.id === 'string' ? row.id : '';
  const conversationId = typeof row.conversation_id === 'string' ? row.conversation_id : '';
  const senderUserId = typeof row.sender_user_id === 'string' ? row.sender_user_id : '';
  const body = typeof row.body === 'string' ? row.body : '';
  const createdAt = typeof row.created_at === 'string' ? row.created_at : '';
  if (!id || !conversationId || !senderUserId || !body || !createdAt) return null;
  return {
    id,
    conversation_id: conversationId,
    sender_user_id: senderUserId,
    body,
    created_at: createdAt,
  };
}

function conversationPreviewPatch(row: Record<string, unknown>): Partial<PetFeedConversation> | null {
  const id = typeof row.id === 'string' ? row.id : '';
  if (!id) return null;
  return {
    id,
    last_message_at: typeof row.last_message_at === 'string' ? row.last_message_at : row.last_message_at == null ? null : undefined,
    last_message_preview: typeof row.last_message_preview === 'string' ? row.last_message_preview : undefined,
    last_message_sender_user_id:
      typeof row.last_message_sender_user_id === 'string'
        ? row.last_message_sender_user_id
        : row.last_message_sender_user_id == null
          ? null
          : undefined,
    sen_last_read_at:
      typeof row.sen_last_read_at === 'string' ? row.sen_last_read_at : row.sen_last_read_at == null ? null : undefined,
    breeder_last_read_at:
      typeof row.breeder_last_read_at === 'string'
        ? row.breeder_last_read_at
        : row.breeder_last_read_at == null
          ? null
          : undefined,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  };
}

/** Live INSERT on one conversation's messages. Returns unsubscribe. */
export function subscribePetFeedThreadMessages(
  accessToken: string,
  conversationId: string,
  onMessage: (message: PetFeedMessage) => void,
): () => void {
  const client = getClient(accessToken);
  if (!client || !conversationId) return () => undefined;

  const channel: RealtimeChannel = client
    .channel(`pet-feed-dm:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'pet_feed_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const message = toMessage((payload.new ?? {}) as Record<string, unknown>);
        if (message) onMessage(message);
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

/**
 * Live conversation row changes for inbox (RLS limits to participant rows).
 * Returns unsubscribe.
 */
export function subscribePetFeedInboxConversations(
  accessToken: string,
  onConversationChange: (patch: Partial<PetFeedConversation> & { id: string }, event: 'INSERT' | 'UPDATE') => void,
): () => void {
  const client = getClient(accessToken);
  if (!client) return () => undefined;

  const channel: RealtimeChannel = client
    .channel('pet-feed-inbox')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'pet_feed_conversations' },
      (payload) => {
        const patch = conversationPreviewPatch((payload.new ?? {}) as Record<string, unknown>);
        if (patch?.id) onConversationChange(patch as Partial<PetFeedConversation> & { id: string }, 'INSERT');
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'pet_feed_conversations' },
      (payload) => {
        const patch = conversationPreviewPatch((payload.new ?? {}) as Record<string, unknown>);
        if (patch?.id) onConversationChange(patch as Partial<PetFeedConversation> & { id: string }, 'UPDATE');
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
