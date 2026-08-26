import { ActivityIndicator, View } from 'react-native';
import { BRAND } from '../theme/brand';

type LoadingOverlayProps = {
  visible: boolean;
};

export function LoadingOverlay({ visible }: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <View pointerEvents="auto" className="absolute inset-0 z-50 items-center justify-center bg-black/20">
      <ActivityIndicator size="large" color={BRAND.loadingSpinner} />
    </View>
  );
}
