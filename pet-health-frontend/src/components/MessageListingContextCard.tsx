import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PetFeedConversation, PetFeedConversationPostSummary } from '../types';
import { formatPetFeedPrice } from '../utils/petFeedCurrency';
import { formatPetFeedPostTimeLabel } from '../utils/petFeedPostTime';
import { CHAT_UI } from '../utils/chatMedia';

export function resolveConversationPostSummary(
  conversation: PetFeedConversation | null | undefined,
): PetFeedConversationPostSummary | null {
  if (!conversation) return null;
  if (conversation.post_summary) return conversation.post_summary;
  if (!conversation.post_id) return null;
  return {
    id: conversation.post_id,
    title: conversation.post_title || '',
    thumb_url: conversation.post_thumb_url,
    price_note: '',
    species: '',
    breed: '',
    location: '',
    status: 'published',
    created_at: null,
    updated_at: null,
  };
}

type MessageListingContextCardProps = {
  conversation?: PetFeedConversation | null;
  summary?: PetFeedConversationPostSummary | null;
  currentUserId: string | null;
  compact?: boolean;
  onOpenListing?: (postId: string) => void;
};

export function MessageListingContextCard({
  conversation = null,
  summary: summaryProp,
  currentUserId,
  compact = false,
  onOpenListing,
}: MessageListingContextCardProps) {
  const { t, i18n } = useTranslation();
  const summary = summaryProp || resolveConversationPostSummary(conversation);
  if (!summary?.id) return null;

  const isBreeder = Boolean(currentUserId && conversation?.breeder_user_id === currentUserId);
  const titleKey = isBreeder ? 'petFeed.messages.contextCardTitleBreeder' : 'petFeed.messages.contextCardTitle';
  const unavailable = summary.status !== 'published';
  const priceLabel = summary.price_note ? formatPetFeedPrice(summary.price_note, i18n.language) : '';
  const speciesKey = summary.species ? `breederProfile.speciesOptions.${summary.species.trim().toLowerCase()}` : '';
  const speciesLabel = summary.species ? t(speciesKey) : '';
  const resolvedSpecies = speciesLabel === speciesKey ? summary.species : speciesLabel;
  const detailLine = [summary.breed || resolvedSpecies, summary.location, priceLabel].filter(Boolean).join(' · ');
  const timeLabel = compact ? '' : formatPetFeedPostTimeLabel(summary, t, i18n.language);

  const content = (
    <View
      className={`${compact ? 'p-2.5' : 'mx-4 mt-3 p-3'} rounded-2xl border bg-white`}
      style={{ borderColor: CHAT_UI.border }}
    >
      {!compact ? (
        <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: CHAT_UI.eyebrow }}>
          {t(titleKey)}
        </Text>
      ) : null}
      <View className={`${compact ? '' : 'mt-2.5'} flex-row gap-3`}>
        <View className={`${compact ? 'h-12 w-12' : 'h-16 w-16'} overflow-hidden rounded-xl bg-amber-50`}>
          {summary.thumb_url ? (
            <Image
              source={{ uri: summary.thumb_url }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={100}
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Ionicons name="paw-outline" size={compact ? 20 : 24} color={CHAT_UI.accent} />
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1 justify-center">
          <Text className="text-sm font-bold leading-5 text-slate-900" numberOfLines={2}>
            {summary.title || t('petFeed.messages.listingFallback')}
          </Text>
          {detailLine ? (
            <Text className="mt-1 text-xs leading-4 text-slate-500" numberOfLines={2}>
              {detailLine}
            </Text>
          ) : null}
          {timeLabel ? (
            <Text className="mt-1 text-[11px] leading-4 text-slate-400" numberOfLines={2}>
              {timeLabel}
            </Text>
          ) : null}
          {unavailable ? (
            <Text className="mt-1 text-xs font-semibold text-amber-700">
              {t('petFeed.messages.listingUnavailable')}
            </Text>
          ) : null}
        </View>
        {onOpenListing && !unavailable ? (
          <View className="justify-center">
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </View>
        ) : null}
      </View>
    </View>
  );

  if (!onOpenListing || unavailable) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('petFeed.messages.openListing', { title: summary.title })}
      onPress={() => onOpenListing(summary.id)}
      className="active:opacity-95"
    >
      {content}
    </Pressable>
  );
}
