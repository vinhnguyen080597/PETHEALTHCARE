import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { VideoView, useVideoPlayer } from 'expo-video';
import { BRAND } from '../theme/brand';

type ListingVideoPreviewProps = {
  uri: string;
  testID?: string;
};

export function ListingVideoPreparingPlaceholder({ testID }: { testID?: string }) {
  const { t } = useTranslation();
  return (
    <View
      testID={testID}
      className="items-center justify-center overflow-hidden rounded-xl bg-slate-900"
      style={{ height: 200 }}
    >
      <ActivityIndicator size="large" color={BRAND.loadingSpinner} />
      <Text className="mt-3 px-4 text-center text-sm font-bold text-white">
        {t('createPetFeedPost.videoPreparing')}
      </Text>
      <Text className="mt-1 px-6 text-center text-xs text-slate-300">
        {t('createPetFeedPost.videoPreparingHint')}
      </Text>
    </View>
  );
}

/** Playable listing-video review, with a loading overlay until the player can render. */
export function ListingVideoPreview({ uri, testID }: ListingVideoPreviewProps) {
  const { t } = useTranslation();
  const player = useVideoPlayer({ uri }, (instance) => {
    instance.loop = false;
    instance.muted = false;
  });
  const [ready, setReady] = useState(player.status === 'readyToPlay');

  useEffect(() => {
    setReady(player.status === 'readyToPlay');
    const sub = player.addListener('statusChange', ({ status }) => {
      setReady(status === 'readyToPlay');
    });
    return () => sub.remove();
  }, [player]);

  return (
    <View testID={testID} className="overflow-hidden rounded-xl bg-black" style={{ height: 200 }}>
      <VideoView
        player={player}
        nativeControls
        contentFit="contain"
        style={{ height: '100%', width: '100%' }}
      />
      {ready ? null : (
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center bg-black/70"
        >
          <ActivityIndicator color="#fff" />
          <Text className="mt-2 px-4 text-center text-xs font-semibold text-white">
            {t('createPetFeedPost.videoLoadingPreview')}
          </Text>
        </View>
      )}
    </View>
  );
}
