import type { ReactNode } from 'react';
import { View } from 'react-native';

type ResponsiveFrameProps = {
  children: ReactNode;
  maxWidth?: number;
};

export function ResponsiveFrame({ children, maxWidth = 760 }: ResponsiveFrameProps) {
  return (
    <View className="flex-1 self-center" style={{ width: '100%', maxWidth }}>
      {children}
    </View>
  );
}
