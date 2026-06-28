import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MAI_UNFORTUNATELY } from '../assets/maiAssets';
import {
  getRewardedAdAvailability,
  preloadRewardedAd,
  subscribeRewardedAdAvailability,
  type RewardedAdAvailability,
} from '../services/rewardedAd';

const PRIMARY = '#1E6FE8';
const MAX_WATCH_FAILS_BEFORE_HIDE_VIDEO = 2;

export type RewardedAdFeature = 'health_analysis' | 'breed_recognition';

type RewardedAdOfferProps = {
  feature: RewardedAdFeature;
  onWatch: () => Promise<boolean>;
  onSubscribe?: () => void;
  onDismiss?: () => void;
  creditsPerAd?: number;
  disabled?: boolean;
  testID?: string;
  layout?: 'card' | 'compact';
  className?: string;
};

function MaiUnfortunatelyImage({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      source={MAI_UNFORTUNATELY}
      contentFit="contain"
      cachePolicy="memory-disk"
      recyclingKey="mai-unfortunately-transparent"
      accessibilityLabel="Mai"
      style={{
        width: compact ? 88 : 108,
        height: compact ? 108 : 132,
        flexShrink: 0,
        backgroundColor: 'transparent',
      }}
    />
  );
}

export function RewardedAdOffer({
  onWatch,
  onSubscribe,
  onDismiss,
  disabled = false,
  testID = 'rewarded-ad-offer',
  layout = 'card',
  className = '',
}: RewardedAdOfferProps) {
  const { t } = useTranslation();
  const [availability, setAvailability] = useState<RewardedAdAvailability>(() => getRewardedAdAvailability());
  const [watching, setWatching] = useState(false);
  const [preloading, setPreloading] = useState(false);
  const [watchFailCount, setWatchFailCount] = useState(0);
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);
  const isCard = layout === 'card';

  useEffect(() => {
    void preloadRewardedAd();
    return subscribeRewardedAdAvailability(setAvailability);
  }, []);

  const adsBlocked = availability === 'unsupported' || availability === 'unavailable';
  const hideVideoCta = adsBlocked && watchFailCount >= MAX_WATCH_FAILS_BEFORE_HIDE_VIDEO;
  const showVideoCta = !hideVideoCta && availability !== 'unsupported';
  const premiumPrimary = hideVideoCta || (adsBlocked && watchFailCount > 0) || !showVideoCta;
  const showRetry = showVideoCta && (adsBlocked || watchFailCount > 0);

  async function handleWatch() {
    if (watching || disabled || preloading) return;
    setWatching(true);
    setInlineMessage(null);
    try {
      const ok = await onWatch();
      if (!ok) {
        const nextFails = watchFailCount + 1;
        setWatchFailCount(nextFails);
        setInlineMessage(
          nextFails >= MAX_WATCH_FAILS_BEFORE_HIDE_VIDEO
            ? t('rewardedAd.noAdUsePremium')
            : t('rewardedAd.loadFailed'),
        );
        void preloadRewardedAd();
      }
    } finally {
      setWatching(false);
    }
  }

  async function handleRetryPreload() {
    if (preloading || disabled) return;
    setPreloading(true);
    setInlineMessage(null);
    try {
      const status = await preloadRewardedAd();
      if (status !== 'ready') {
        setInlineMessage(t('rewardedAd.noAdRetry'));
      }
    } finally {
      setPreloading(false);
    }
  }

  const videoLoading = watching || availability === 'loading' || preloading;
  const videoDisabled = disabled || videoLoading || (adsBlocked && watchFailCount === 0);

  return (
    <View className={className} testID={testID}>
      <View className={`flex-row items-start gap-3 ${isCard ? '' : 'mb-1'}`}>
        <Text className={`min-w-0 flex-1 text-slate-700 ${isCard ? 'text-sm leading-6' : 'text-sm leading-5'}`}>
          {t('rewardedAd.exhaustedMessage')}
        </Text>
        <MaiUnfortunatelyImage compact={!isCard} />
      </View>

      {inlineMessage ? (
        <Text className={`text-sm leading-5 text-amber-800 ${isCard ? 'mt-4' : 'mt-3'}`}>{inlineMessage}</Text>
      ) : null}

      {showVideoCta ? (
        <Pressable
          testID={`${testID}-watch-button`}
          accessibilityRole="button"
          accessibilityState={{ disabled: videoDisabled }}
          className={`flex-row items-center justify-center rounded-xl py-3.5 active:opacity-90 ${isCard ? 'mt-4' : 'mt-3'} ${premiumPrimary ? 'border border-blue-200 bg-blue-50' : ''} ${videoDisabled ? 'opacity-50' : ''}`}
          style={premiumPrimary ? undefined : { backgroundColor: PRIMARY }}
          onPress={() => void handleWatch()}
          disabled={videoDisabled}
        >
          {videoLoading ? <ActivityIndicator color={premiumPrimary ? PRIMARY : '#fff'} style={{ marginRight: 8 }} /> : null}
          <Text className="text-base font-semibold" style={{ color: premiumPrimary ? PRIMARY : '#fff' }}>
            {videoLoading ? t('rewardedAd.loading') : t('rewardedAd.watchCta')}
          </Text>
        </Pressable>
      ) : null}

      {showVideoCta && !premiumPrimary ? (
        <Text className={`text-center text-xs text-slate-500 ${isCard ? 'mt-2' : 'mt-1.5'}`}>
          {t('rewardedAd.watchHint')}
        </Text>
      ) : null}

      {onSubscribe ? (
        <Pressable
          testID={`${testID}-premium-button`}
          accessibilityRole="button"
          className={`flex-row items-center justify-center rounded-xl py-3.5 active:opacity-90 ${showVideoCta ? (isCard ? 'mt-3' : 'mt-2.5') : isCard ? 'mt-4' : 'mt-3'} ${!premiumPrimary ? 'border border-slate-200 bg-white' : ''} ${disabled ? 'opacity-50' : ''}`}
          style={premiumPrimary ? { backgroundColor: PRIMARY } : undefined}
          onPress={onSubscribe}
          disabled={disabled}
        >
          <Text className="text-base font-semibold" style={{ color: premiumPrimary ? '#fff' : '#0f172a' }}>
            {t('premium.subscribeCta')}
          </Text>
        </Pressable>
      ) : null}

      {onSubscribe && !premiumPrimary ? (
        <Text className={`text-center text-xs text-slate-500 ${isCard ? 'mt-2' : 'mt-1.5'}`}>
          {t('premium.subscribeHint')}
        </Text>
      ) : null}

      {showRetry ? (
        <Pressable
          testID={`${testID}-retry-button`}
          accessibilityRole="button"
          className={`items-center py-2 active:opacity-70 ${isCard ? 'mt-2' : 'mt-1'}`}
          onPress={() => void handleRetryPreload()}
          disabled={preloading || disabled}
        >
          <Text className="text-sm font-medium text-slate-500">
            {preloading ? t('rewardedAd.loading') : t('rewardedAd.retryAd')}
          </Text>
        </Pressable>
      ) : null}

      {onDismiss ? (
        <Pressable
          testID={`${testID}-dismiss-button`}
          accessibilityRole="button"
          className={`items-center py-2 active:opacity-70 ${isCard ? 'mt-2' : 'mt-1'}`}
          onPress={onDismiss}
        >
          <Text className="text-sm font-medium text-slate-500">{t('rewardedAd.notNow')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
