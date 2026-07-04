import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { modalBottomInset } from '../utils/modalSafeArea';

type ModalBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  backdropClassName?: string;
  sheetClassName?: string;
  closeAccessibilityLabel?: string;
};

export function ModalBottomSheet({
  visible,
  onClose,
  children,
  backdropClassName = 'bg-black/50',
  sheetClassName = 'rounded-t-2xl bg-white px-4 pt-4',
  closeAccessibilityLabel = 'Close',
}: ModalBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = modalBottomInset(insets.bottom, 12);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className={`flex-1 justify-end ${backdropClassName}`}>
        <Pressable className="flex-1" accessibilityRole="button" accessibilityLabel={closeAccessibilityLabel} onPress={onClose} />
        <View className={sheetClassName} style={{ paddingBottom: bottomInset }}>
          {children}
        </View>
      </View>
    </Modal>
  );
}
