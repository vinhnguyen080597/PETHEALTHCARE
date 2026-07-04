import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { modalBottomInset, modalTopInset } from '../utils/modalSafeArea';

type ModalScreenShellProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeLabel?: string;
  closeTestID?: string;
  closeIconName?: keyof typeof Ionicons.glyphMap;
  footer?: ReactNode;
  scrollPaddingHorizontal?: number;
  scrollPaddingBottom?: number;
};

export function ModalScreenShell({
  visible,
  title,
  onClose,
  children,
  closeLabel = 'Close',
  closeTestID,
  closeIconName = 'arrow-back',
  footer,
  scrollPaddingHorizontal = 20,
  scrollPaddingBottom = 24,
}: ModalScreenShellProps) {
  const insets = useSafeAreaInsets();
  const topInset = modalTopInset(insets.top);
  const bottomInset = modalBottomInset(insets.bottom);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-[#F2F4F8]" style={footer ? undefined : { paddingBottom: bottomInset }}>
        <View className="flex-row items-center border-b border-gray-200 bg-white px-2 pb-2" style={{ paddingTop: topInset + 8 }}>
          <Pressable
            testID={closeTestID}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            className="w-14 rounded-lg p-2 active:bg-slate-100"
            hitSlop={8}
            onPress={onClose}
          >
            <Ionicons name={closeIconName} size={24} color="#1e293b" />
          </Pressable>
          <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{title}</Text>
          <View className="w-14" />
        </View>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: scrollPaddingHorizontal,
            paddingTop: 16,
            paddingBottom: scrollPaddingBottom,
          }}
        >
          {children}
        </ScrollView>
        {footer ? (
          <View className="border-t border-gray-200 bg-white" style={{ paddingBottom: bottomInset }}>
            {footer}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
