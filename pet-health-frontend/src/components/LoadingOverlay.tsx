import { ActivityIndicator, View } from 'react-native';

type LoadingOverlayProps = {
  visible: boolean;
};

export function LoadingOverlay({ visible }: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <View className="absolute inset-0 items-center justify-center bg-black/20">
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}
