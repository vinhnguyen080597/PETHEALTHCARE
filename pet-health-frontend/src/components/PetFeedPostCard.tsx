import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { BreederProfile, PetFeedPost } from '../types';

const PRIMARY = '#1E6FE8';
const REPORT_REASONS = ['scam', 'misleading_health_claims', 'abusive_content', 'fake_contact', 'unsafe_transaction'] as const;

type PetFeedPostCardProps = {
  post: PetFeedPost;
  onToggleFavorite?: (post: PetFeedPost) => void;
  onReportPost?: (post: PetFeedPost, reason: string, note?: string) => void;
  onHideBreeder?: (profile: BreederProfile) => void;
  showFavorite?: boolean;
  showContact?: boolean;
  showReport?: boolean;
  showHideBreeder?: boolean;
  variant?: 'compact' | 'full';
  autoPlayVideo?: boolean;
  onPress?: (post: PetFeedPost) => void;
  testID?: string;
};

function firstContact(post: PetFeedPost) {
  const contact = { ...(post.breeder_profile?.contact ?? {}), ...(post.contact ?? {}) };
  const zalo = typeof contact.zalo === 'string' ? contact.zalo.trim() : '';
  const facebook = typeof contact.facebook === 'string' ? contact.facebook.trim() : '';
  const phone = typeof contact.phone === 'string' ? contact.phone.trim() : '';
  const zaloUrl = safeZaloUrl(zalo);
  if (zaloUrl) return zaloUrl;
  const facebookUrl = safeFacebookUrl(facebook);
  if (facebookUrl) return facebookUrl;
  const phoneUrl = safePhoneUrl(phone);
  if (phoneUrl) return phoneUrl;
  return '';
}

function safeHttpUrl(value: string, allowedHosts: string[]) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return '';
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)) ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function safeZaloUrl(value: string) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return safeHttpUrl(value, ['zalo.me']);
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 ? `https://zalo.me/${digits}` : '';
}

function safeFacebookUrl(value: string) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return safeHttpUrl(value, ['facebook.com', 'fb.com', 'm.me']);
  const handle = value.replace(/^@/, '').replace(/[^a-zA-Z0-9._-]/g, '');
  return handle ? `https://facebook.com/${encodeURIComponent(handle)}` : '';
}

function safePhoneUrl(value: string) {
  const cleaned = value.replace(/[^\d+]/g, '');
  return cleaned.replace(/\D/g, '').length >= 8 ? `tel:${cleaned}` : '';
}

function ContactButton({ post }: { post: PetFeedPost }) {
  const { t } = useTranslation();
  const url = firstContact(post);
  return (
    <Pressable
      testID={`pet-feed-contact-button-${post.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Contact breeder for ${post.title}`}
      className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${url ? 'bg-blue-600 active:opacity-90' : 'bg-slate-200'}`}
      disabled={!url}
      onPress={() => {
        if (!url) return;
        Alert.alert(t('petFeed.contactConfirmTitle'), t('petFeed.contactConfirmBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('petFeed.contactConfirmOpen'), onPress: () => void Linking.openURL(url) },
        ]);
      }}
    >
      <Ionicons name="chatbubble-ellipses-outline" size={17} color={url ? '#fff' : '#94a3b8'} />
      <Text className={`text-sm font-bold ${url ? 'text-white' : 'text-slate-400'}`}>{t('petFeed.contact')}</Text>
    </Pressable>
  );
}

function HideBreederButton({ profile, onHideBreeder }: { profile?: BreederProfile | null; onHideBreeder?: (profile: BreederProfile) => void }) {
  const { t } = useTranslation();
  if (!profile || !onHideBreeder) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Hide breeder ${profile.display_name}`}
      className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 active:bg-red-100"
      onPress={() => {
        Alert.alert(t('breederDetail.blockTitle'), t('breederDetail.blockBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('breederDetail.blockConfirm'), style: 'destructive', onPress: () => onHideBreeder(profile) },
        ]);
      }}
    >
      <Ionicons name="eye-off-outline" size={18} color="#b91c1c" />
    </Pressable>
  );
}

function DetailLine({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  if (!text) return null;
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1.5">
      <Ionicons name={icon} size={13} color="#64748b" />
      <Text className="text-xs font-medium text-slate-600">{text}</Text>
    </View>
  );
}

function AutoPlayVideo({ uri, autoPlay }: { uri: string; autoPlay: boolean }) {
  const player = useVideoPlayer({ uri }, (instance) => {
    instance.loop = true;
    instance.muted = true;
    if (autoPlay) instance.play();
  });

  useEffect(() => {
    player.muted = true;
    if (autoPlay) player.play();
    else player.pause();
  }, [autoPlay, player]);

  return (
    <VideoView
      player={player}
      nativeControls={!autoPlay}
      contentFit="cover"
      style={{ height: '100%', width: '100%' }}
    />
  );
}

function PetFeedMedia({ post, autoPlayVideo }: { post: PetFeedPost; autoPlayVideo: boolean }) {
  const imageUrl = post.media_urls[0];
  if (post.video_url) {
    return <AutoPlayVideo uri={post.video_url} autoPlay={autoPlayVideo} />;
  }
  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} className="h-full w-full" resizeMode="cover" />;
  }
  return (
    <View className="h-full w-full items-center justify-center">
      <Ionicons name="paw-outline" size={46} color={PRIMARY} />
    </View>
  );
}

export function PetFeedPostCard({
  post,
  onToggleFavorite,
  onReportPost,
  onHideBreeder,
  showFavorite = true,
  showContact = true,
  showReport = true,
  showHideBreeder = false,
  variant = 'full',
  autoPlayVideo = false,
  onPress,
  testID,
}: PetFeedPostCardProps) {
  const { t } = useTranslation();
  const breeder = post.breeder_profile;
  const showActions = showContact || showReport || showHideBreeder;
  const isCompact = variant === 'compact';
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState<(typeof REPORT_REASONS)[number]>('scam');
  const [reportNote, setReportNote] = useState('');

  function submitReport() {
    onReportPost?.(post, reportReason, reportNote);
    setReportVisible(false);
    setReportNote('');
  }

  const content = (
    <>
      <View className="h-48 bg-blue-50">
        <PetFeedMedia post={post} autoPlayVideo={autoPlayVideo} />
      </View>
      {isCompact ? (
        <View className="p-4">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="min-w-0 flex-1 text-lg font-bold text-slate-900" numberOfLines={2}>{post.title}</Text>
            {post.price_note ? (
              <Text className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-sm font-bold text-blue-700" numberOfLines={1}>
                {post.price_note}
              </Text>
            ) : null}
          </View>
          <Text className="mt-1 text-sm text-slate-500" numberOfLines={1}>
            {breeder?.display_name ?? t('petFeed.breederFallback')}
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <DetailLine icon="male-female-outline" text={post.gender} />
            <DetailLine icon="calendar-outline" text={post.age_months != null ? t('petFeed.ageMonths', { count: post.age_months }) : ''} />
            <DetailLine icon="location-outline" text={post.location || t('petFeed.locationUnknown')} />
          </View>
        </View>
      ) : (
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-lg font-bold text-slate-900" numberOfLines={2}>{post.title}</Text>
            <Text className="mt-1 text-sm text-slate-500" numberOfLines={1}>
              {breeder?.display_name ?? t('petFeed.breederFallback')} · {post.location || t('petFeed.locationUnknown')}
            </Text>
          </View>
          {showFavorite ? (
            <Pressable
              testID={`pet-feed-favorite-button-${post.id}`}
              accessibilityRole="button"
              accessibilityLabel={post.is_favorited ? 'Remove saved pet listing' : 'Save pet listing'}
              className="rounded-full bg-slate-50 p-2"
              onPress={() => onToggleFavorite?.(post)}
            >
              <Ionicons name={post.is_favorited ? 'heart' : 'heart-outline'} size={22} color={post.is_favorited ? '#dc2626' : '#64748b'} />
            </Pressable>
          ) : null}
        </View>
        <View className="mt-3 flex-row flex-wrap gap-2">
          <DetailLine icon="paw-outline" text={[post.species, post.breed].filter(Boolean).join(' · ')} />
          <DetailLine icon="calendar-outline" text={post.age_months != null ? t('petFeed.ageMonths', { count: post.age_months }) : ''} />
          <DetailLine icon="male-female-outline" text={post.gender} />
          <DetailLine icon="cash-outline" text={post.price_note} />
        </View>
        {post.personality.length > 0 ? (
          <Text className="mt-3 text-sm leading-5 text-slate-700">{t('petFeed.personality')}: {post.personality.join(', ')}</Text>
        ) : null}
        <View className="mt-3 rounded-xl bg-slate-50 p-3">
          <Text className="text-xs font-bold uppercase text-slate-500">{t('petFeed.healthInfo')}</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-700">
            {post.vaccine_status || t('petFeed.vaccineUnknown')}
            {post.deworming_status ? ` · ${post.deworming_status}` : ''}
          </Text>
          {post.paperwork.length > 0 ? (
            <Text className="mt-1 text-sm leading-5 text-slate-700">{t('petFeed.paperwork')}: {post.paperwork.join(', ')}</Text>
          ) : null}
        </View>
        {post.description ? <Text className="mt-3 text-sm leading-5 text-slate-700">{post.description}</Text> : null}
        {showActions ? (
          <View className="mt-4 flex-row gap-3">
            {showContact ? <ContactButton post={post} /> : null}
            {showHideBreeder ? <HideBreederButton profile={breeder} onHideBreeder={onHideBreeder} /> : null}
            {showReport ? (
              <Pressable
                testID={`pet-feed-report-button-${post.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Report listing ${post.title}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
                onPress={() => setReportVisible(true)}
              >
                <Ionicons name="flag-outline" size={18} color="#64748b" />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID ?? `pet-feed-post-${post.id}`}
        accessibilityRole="button"
        accessibilityLabel={`Open listing ${post.title}`}
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm active:opacity-95"
        onPress={() => onPress(post)}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <>
      <View testID={testID ?? `pet-feed-post-${post.id}`} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {content}
      </View>
      <ReportModal
        visible={reportVisible}
        reason={reportReason}
        note={reportNote}
        onChangeReason={setReportReason}
        onChangeNote={setReportNote}
        onCancel={() => setReportVisible(false)}
        onSubmit={submitReport}
      />
    </>
  );
}

function ReportModal({
  visible,
  reason,
  note,
  onChangeReason,
  onChangeNote,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  reason: (typeof REPORT_REASONS)[number];
  note: string;
  onChangeReason: (reason: (typeof REPORT_REASONS)[number]) => void;
  onChangeNote: (note: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 justify-center bg-black/40 px-5">
        <View className="rounded-3xl bg-white p-5">
          <Text className="text-lg font-bold text-slate-900">{t('petFeed.reportListing')}</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-500">{t('petFeed.reportBody')}</Text>
          <View className="mt-4 gap-2">
            {REPORT_REASONS.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                className={`flex-row items-center justify-between rounded-xl border px-3 py-3 ${
                  reason === item ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
                onPress={() => onChangeReason(item)}
              >
                <Text className={`text-sm font-semibold ${reason === item ? 'text-blue-700' : 'text-slate-700'}`}>
                  {t(`petFeed.reportReasons.${item}`)}
                </Text>
                {reason === item ? <Ionicons name="checkmark" size={18} color={PRIMARY} /> : null}
              </Pressable>
            ))}
          </View>
          <TextInput
            className="mt-4 min-h-[84px] rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-sm text-slate-900"
            placeholder={t('petFeed.reportNotePlaceholder')}
            placeholderTextColor="#94a3b8"
            multiline
            textAlignVertical="top"
            value={note}
            onChangeText={onChangeNote}
          />
          <View className="mt-4 flex-row gap-3">
            <Pressable className="flex-1 rounded-xl border border-gray-200 py-3" onPress={onCancel}>
              <Text className="text-center text-sm font-bold text-slate-700">{t('common.cancel')}</Text>
            </Pressable>
            <Pressable className="flex-1 rounded-xl bg-blue-600 py-3" onPress={onSubmit}>
              <Text className="text-center text-sm font-bold text-white">{t('petFeed.submitReport')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
