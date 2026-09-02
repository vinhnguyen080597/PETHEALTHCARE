import type { ReactNode } from 'react';
import { Modal, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { modalBottomInset } from '../utils/modalSafeArea';

type ModalBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Backdrop dim strength 0–1. NativeWind opacity classes are unreliable on RN. */
  backdropOpacity?: number;
  sheetClassName?: string;
  sheetStyle?: StyleProp<ViewStyle>;
  closeAccessibilityLabel?: string;
};

export function ModalBottomSheet({
  visible,
  onClose,
  children,
  backdropOpacity = 0.4,
  sheetClassName = 'rounded-t-2xl bg-white px-4 pt-4',
  sheetStyle,
  closeAccessibilityLabel = 'Close',
}: ModalBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = modalBottomInset(insets.bottom, 12);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeAccessibilityLabel}
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: `rgba(0,0,0,${backdropOpacity})`,
          }}
        />
        <View className={sheetClassName} style={[{ paddingBottom: bottomInset }, sheetStyle]}>
          {children}
        </View>
      </View>
    </Modal>
  );
}
