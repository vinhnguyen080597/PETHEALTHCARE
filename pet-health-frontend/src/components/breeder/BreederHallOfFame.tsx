import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DEFAULT_FARM_AVATAR } from '../../assets/farmProfileAssets';
import type { BreederProfile } from '../../types';
import {
  breederCardSpecialtyLabel,
  canShowBreederVisitFarmAction,
} from '../../utils/breederDirectoryCard';
import {
  hallOfFameMonthKey,
  type HallOfFameMedal,
} from '../../utils/breederHallOfFame';
import { getComplianceScoreFromMetadata } from '../../utils/breederComplianceScore';
import { farmImageSource, resolveFarmAvatarUrl } from '../../utils/farmProfileDisplay';

export type BreederHallOfFameEntry = {
  profile: BreederProfile;
  medal: HallOfFameMedal;
  rating: number | null;
  reviewCount: number;
  trustScore: number;
};

const MEDAL_EMOJI: Record<HallOfFameMedal, string> = {
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
};

const MEDAL_RING: Record<HallOfFameMedal, { border: string; bg: string }> = {
  gold: { border: '#FBBF24', bg: '#FFFBEB' },
  silver: { border: '#CBD5E1', bg: '#F8FAFC' },
  bronze: { border: '#FDBA74', bg: '#FFF7ED' },
};

const MEDAL_I18N: Record<HallOfFameMedal, string> = {
  gold: 'petFeed.hall.medal.gold',
  silver: 'petFeed.hall.medal.silver',
  bronze: 'petFeed.hall.medal.bronze',
};

const CARD_WIDTH = 280;
const INK = '#2B1E19';
const MUTED = '#6E5A51';
const MEDAL_LABEL = '#9A3412';

type BreederHallOfFameProps = {
  entries: BreederHallOfFameEntry[];
  currentUserId?: string | null;
  onOpenFarm: (profileId: string) => void;
};

function HallCard({
  entry,
  currentUserId,
  onOpenFarm,
}: {
  entry: BreederHallOfFameEntry;
  currentUserId?: string | null;
  onOpenFarm: (profileId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'vi';
  const { profile, medal } = entry;
  const ring = MEDAL_RING[medal];
  const name = profile.display_name || t('petFeed.breederFallback');
  const canOpen = canShowBreederVisitFarmAction(currentUserId, profile.user_id);
  const avatar = resolveFarmAvatarUrl(profile);
  const ratingText =
    entry.rating != null && entry.reviewCount > 0
      ? `${entry.rating.toFixed(1)}/5 (${entry.reviewCount})`
      : null;
  const complianceScore = getComplianceScoreFromMetadata(profile.metadata);

  const body = (
    <>
      <View className="flex-row items-start" style={{ gap: 12 }}>
        <Image
          source={farmImageSource(avatar, DEFAULT_FARM_AVATAR)}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            borderWidth: 2,
            borderColor: '#fff',
            backgroundColor: '#fff',
          }}
          contentFit="cover"
        />
        <View className="min-w-0 flex-1">
          <Text
            className="text-[11px] font-bold uppercase"
            style={{ color: MEDAL_LABEL, letterSpacing: 0.4 }}
          >
            {`${MEDAL_EMOJI[medal]} ${t(MEDAL_I18N[medal])}`}
          </Text>
          <Text className="mt-0.5 font-bold" style={{ color: INK }} numberOfLines={1}>
            {name}
          </Text>
          <Text className="mt-0.5 text-xs" style={{ color: MUTED }} numberOfLines={1}>
            {breederCardSpecialtyLabel(profile, lang)}
          </Text>
        </View>
      </View>
      <View className="mt-3 flex-row flex-wrap" style={{ gap: 12 }}>
        {ratingText ? (
          <Text className="text-xs" style={{ color: 'rgba(43,30,25,0.8)' }}>
            {`⭐ ${ratingText}`}
          </Text>
        ) : null}
        <Text className="text-xs" style={{ color: 'rgba(43,30,25,0.8)' }}>
          {`🛡️ ${entry.trustScore}/100`}
        </Text>
        <Text className="text-xs" style={{ color: 'rgba(43,30,25,0.8)' }}>
          {`⚖️ ${complianceScore}/100`}
        </Text>
      </View>
    </>
  );

  const cardStyle = {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: ring.border,
    backgroundColor: ring.bg,
    padding: 16,
  } as const;

  if (!canOpen) {
    return <View style={cardStyle}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={() => onOpenFarm(profile.id || profile.user_id)}
      className="active:opacity-90"
      style={cardStyle}
    >
      {body}
    </Pressable>
  );
}

export function BreederHallOfFame({
  entries,
  currentUserId,
  onOpenFarm,
}: BreederHallOfFameProps) {
  const { t } = useTranslation();
  if (!entries.length) return null;
  const title = t('petFeed.hall.title', { month: hallOfFameMonthKey() });

  return (
    <View className="pb-4">
      <View className="px-5">
        <Text className="text-xl font-semibold tracking-tight" style={{ color: INK }}>
          {`👑 ${title}`}
        </Text>
        <Text className="mt-1 text-sm" style={{ color: MUTED }}>
          {t('petFeed.hall.subtitle')}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, gap: 16 }}
      >
        {entries.map((entry) => (
          <HallCard
            key={entry.profile.id || entry.profile.user_id}
            entry={entry}
            currentUserId={currentUserId}
            onOpenFarm={onOpenFarm}
          />
        ))}
      </ScrollView>
    </View>
  );
}
