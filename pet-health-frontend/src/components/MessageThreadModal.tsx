import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIosKeyboardOverlap } from '../hooks/useIosKeyboardOverlap';
import type { PetFeedConversation, PetFeedMessage } from '../types';
import {
  appendChatMediaPicks,
  CHAT_MEDIA_MAX,
  CHAT_UI,
  chatMediaKindFromMeta,
  isChatVideoUrl,
  isFarmChatConversation,
  MESSAGE_MAX_LEN,
  messageHasSendableContent,
  normalizeMessageMedia,
  type ChatAttachmentPick,
  type ChatMediaPickError,
} from '../utils/chatMedia';
import { modalBottomInset, modalTopInset } from '../utils/modalSafeArea';
import { MessageListingContextCard } from './MessageListingContextCard';

export type MessageSendPayload = {
  body: string;
  attachments?: ChatAttachmentPick[];
};

export type MessageThreadModalProps = {
  visible: boolean;
  conversation: PetFeedConversation | null;
  messages: PetFeedMessage[];
  currentUserId: string | null;
  loading: boolean;
  sending: boolean;
  error: string;
  onClose: () => void;
  onRefresh: () => Promise<void> | void;
  onSend: (payload: MessageSendPayload) => Promise<boolean>;
  onOpenListing?: (postId: string) => void;
};

function formatMessageTime(value: string, locale: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleTimeString(locale.startsWith('vi') ? 'vi-VN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function pickErrorKey(error: ChatMediaPickError): string {
  if (error === 'too_many') return 'petFeed.messages.mediaTooMany';
  if (error === 'video_too_large') return 'petFeed.messages.videoTooLarge';
  return 'petFeed.messages.mediaUnsupported';
}

export function MessageThreadView({
  conversation,
  messages,
  currentUserId,
  loading,
  sending,
  error,
  onClose,
  onRefresh,
  onSend,
  onOpenListing,
  headerTopInset = 0,
  composerBottomInset = 10,
}: Omit<MessageThreadModalProps, 'visible'> & {
  headerTopInset?: number;
  composerBottomInset?: number;
}) {
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachmentPick[]>([]);
  const [pickError, setPickError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<PetFeedMessage>>(null);
  const keyboardOverlap = useIosKeyboardOverlap();

  useEffect(() => {
    if (!conversation) {
      setDraft('');
      setAttachments([]);
      setPickError('');
    }
  }, [conversation?.id]);

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [messages.length, keyboardOverlap, attachments.length]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  async function pickAttachments() {
    if (sending || attachments.length >= CHAT_MEDIA_MAX) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('alerts.permissionGallery.title'), t('alerts.permissionGallery.message'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, CHAT_MEDIA_MAX - attachments.length),
      quality: 0.85,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets?.length) return;

    const incoming: ChatAttachmentPick[] = [];
    let unsupported = false;
    for (const asset of result.assets) {
      const kind = chatMediaKindFromMeta({
        mimeType: asset.mimeType,
        fileName: asset.fileName,
        uri: asset.uri,
      });
      if (!kind) {
        unsupported = true;
        continue;
      }
      incoming.push({
        uri: asset.uri,
        kind,
        mimeType: asset.mimeType || undefined,
        fileName: asset.fileName || undefined,
        fileSize: asset.fileSize ?? undefined,
      });
    }
    const picked = appendChatMediaPicks(attachments, incoming);
    setAttachments(picked.files);
    if (picked.error) setPickError(t(pickErrorKey(picked.error)));
    else if (unsupported) setPickError(t('petFeed.messages.mediaUnsupported'));
    else setPickError('');
  }

  async function handleSend() {
    const trimmed = draft.trim().slice(0, MESSAGE_MAX_LEN);
    if (!messageHasSendableContent(trimmed, attachments.length) || sending || !conversation?.id) return;
    const pending = attachments;
    const ok = await onSend({ body: trimmed, attachments: pending });
    if (ok) {
      setDraft('');
      setAttachments([]);
      setPickError('');
    }
  }

  const canCompose = Boolean(conversation?.id);
  const canSend = messageHasSendableContent(draft, attachments.length) && canCompose && !sending;
  const composerPad = keyboardOverlap > 0 ? 8 : composerBottomInset;
  const subtitle = isFarmChatConversation(conversation)
    ? t('petFeed.messages.chatWithFarm')
    : conversation?.post_title || t('petFeed.messages.listingFallback');

  return (
    <View className="flex-1" style={{ backgroundColor: CHAT_UI.threadBg, paddingBottom: keyboardOverlap }}>
      <View className="bg-white" style={{ paddingTop: headerTopInset, borderBottomWidth: 1, borderBottomColor: CHAT_UI.border }}>
        <View className="flex-row items-center px-1 py-1.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            className="h-9 w-11 items-center justify-center rounded-full active:bg-amber-50"
            hitSlop={8}
            onPress={onClose}
          >
            <Ionicons name="close" size={22} color="#64748B" />
          </Pressable>
          <View className="min-w-0 flex-1 items-center px-1">
            <Text className="text-[15px] font-semibold leading-5 text-slate-900" numberOfLines={1}>
              {conversation?.farm_display_name || conversation?.peer_display_name || t('petFeed.messages.peerFallback')}
            </Text>
            <Text className="text-[11px] leading-4 text-slate-500" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          <View className="w-11" />
        </View>
      </View>

      {loading && messages.length === 0 ? (
        <View className="flex-1 gap-3 px-4 py-5">
          {[0, 1, 2, 3, 4, 5].map((item) => {
            const mine = item % 2 === 1;
            return (
              <View key={item} className={`max-w-[72%] ${mine ? 'self-end items-end' : 'self-start items-start'}`}>
                <View
                  className="rounded-2xl"
                  style={{
                    width: mine ? 168 : 196,
                    height: item % 3 === 0 ? 56 : 40,
                    backgroundColor: mine ? '#FDE68A' : '#E2E8F0',
                  }}
                />
                <View className="mt-1 h-2.5 w-10 rounded-full bg-slate-100" />
              </View>
            );
          })}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ padding: 16, paddingBottom: 12, flexGrow: 1 }}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={CHAT_UI.accent}
            />
          )}
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Text className="text-sm leading-5 text-slate-400">{t('petFeed.messages.threadEmpty')}</Text>
              {error ? <Text className="mt-3 text-center text-sm text-red-600">{error}</Text> : null}
            </View>
          }
          renderItem={({ item }) => {
            const mine = Boolean(currentUserId && item.sender_user_id === currentUserId);
            const media = normalizeMessageMedia(item.media_urls);
            const text = String(item.body || '').trim();
            const listingShare = item.listing_share;
            return (
              <View className={`mb-2 max-w-[82%] ${mine ? 'self-end' : 'self-start'}`}>
                {listingShare?.id ? (
                  <View className="mb-1">
                    <MessageListingContextCard
                      conversation={conversation}
                      summary={listingShare}
                      currentUserId={currentUserId}
                      compact
                      onOpenListing={onOpenListing}
                    />
                  </View>
                ) : null}
                {media.length ? (
                  <View className={`mb-1 gap-1.5 ${mine ? 'items-end' : 'items-start'}`}>
                    {media.map((url) =>
                      isChatVideoUrl(url) ? (
                        <Pressable
                          key={url}
                          accessibilityRole="button"
                          onPress={() => void Linking.openURL(url)}
                          className="h-40 w-[220px] items-center justify-center overflow-hidden rounded-2xl bg-slate-900"
                        >
                          <Ionicons name="play-circle" size={42} color="#fff" />
                        </Pressable>
                      ) : (
                        <Image
                          key={url}
                          source={{ uri: url }}
                          className="h-40 w-[220px] rounded-2xl bg-slate-200"
                          contentFit="cover"
                        />
                      ),
                    )}
                  </View>
                ) : null}
                {text ? (
                  <View
                    className="px-3 py-2"
                    style={{
                      borderRadius: 16,
                      borderBottomRightRadius: mine ? 6 : 16,
                      borderBottomLeftRadius: mine ? 16 : 6,
                      backgroundColor: mine ? CHAT_UI.accent : CHAT_UI.peerBubble,
                    }}
                  >
                    <Text className={`text-sm leading-5 ${mine ? 'text-white' : 'text-slate-800'}`}>{text}</Text>
                  </View>
                ) : null}
                <Text className={`mt-1 text-[10px] text-slate-400 ${mine ? 'text-right' : 'text-left'}`}>
                  {formatMessageTime(item.created_at, i18n.language)}
                </Text>
              </View>
            );
          }}
        />
      )}

      <View className="bg-white px-3 pt-2.5" style={{ borderTopWidth: 1, borderTopColor: CHAT_UI.border, paddingBottom: composerPad }}>
        {attachments.length ? (
          <View className="mb-2 flex-row flex-wrap gap-2">
            {attachments.map((file, index) => (
              <View
                key={`${file.uri}-${index}`}
                className="relative h-14 w-14 overflow-hidden rounded-lg bg-slate-100"
                style={{ borderWidth: 1, borderColor: CHAT_UI.border }}
              >
                {file.kind === 'video' ? (
                  <View className="h-full w-full items-center justify-center bg-slate-800">
                    <Ionicons name="play" size={18} color="#fff" />
                  </View>
                ) : (
                  <Image source={{ uri: file.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('petFeed.messages.removeAttachment')}
                  disabled={sending}
                  onPress={() => setAttachments((current) => current.filter((_, i) => i !== index))}
                  className="absolute right-0.5 top-0.5 h-5 w-5 items-center justify-center rounded-full bg-black/65"
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        {error && messages.length > 0 ? <Text className="mb-2 text-xs text-red-600">{error}</Text> : null}
        {pickError ? <Text className="mb-2 text-xs text-red-600">{pickError}</Text> : null}
        <View className="flex-row items-end gap-1.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('petFeed.messages.attach')}
            disabled={!canCompose || sending || attachments.length >= CHAT_MEDIA_MAX}
            onPress={() => void pickAttachments()}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-amber-50"
            style={{ opacity: !canCompose || sending || attachments.length >= CHAT_MEDIA_MAX ? 0.4 : 1 }}
          >
            <Ionicons name="image-outline" size={20} color="#78716C" />
          </Pressable>
          <TextInput
            testID="pet-feed-message-input"
            accessibilityLabel={t('petFeed.messages.inputLabel')}
            className="min-h-[40px] max-h-28 flex-1 rounded-full border bg-slate-50 px-3.5 py-2 text-sm text-slate-900"
            style={{ borderColor: '#E2E8F0' }}
            placeholder={t('petFeed.messages.placeholder')}
            placeholderTextColor="#94a3b8"
            value={draft}
            onChangeText={(value) => setDraft(value.slice(0, MESSAGE_MAX_LEN))}
            multiline
            maxLength={MESSAGE_MAX_LEN}
            editable={canCompose && !sending}
          />
          <Pressable
            testID="pet-feed-message-send"
            accessibilityRole="button"
            accessibilityLabel={t('petFeed.messages.send')}
            accessibilityState={{ disabled: !canSend }}
            className="h-10 items-center justify-center rounded-full px-3.5"
            style={{ backgroundColor: canSend ? CHAT_UI.accent : '#E2E8F0' }}
            disabled={!canSend}
            onPress={() => void handleSend()}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={16} color={canSend ? '#fff' : '#94a3b8'} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function MessageThreadModal({
  visible,
  conversation,
  messages,
  currentUserId,
  loading,
  sending,
  error,
  onClose,
  onRefresh,
  onSend,
  onOpenListing,
}: MessageThreadModalProps) {
  const insets = useSafeAreaInsets();
  const topInset = modalTopInset(insets.top);
  const bottomInset = modalBottomInset(insets.bottom, 10);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <MessageThreadView
        conversation={conversation}
        messages={messages}
        currentUserId={currentUserId}
        loading={loading}
        sending={sending}
        error={error}
        onClose={onClose}
        onRefresh={onRefresh}
        onSend={onSend}
        onOpenListing={onOpenListing}
        headerTopInset={topInset}
        composerBottomInset={bottomInset}
      />
    </Modal>
  );
}
