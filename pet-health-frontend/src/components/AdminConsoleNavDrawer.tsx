import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  ADMIN_CONSOLE_NAV_ITEMS,
  type AdminConsoleSection,
} from '../constants/adminConsoleNav';
import { BRAND } from '../theme/brand';
import { modalTopInset } from '../utils/modalSafeArea';

type AdminConsoleNavDrawerProps = {
  visible: boolean;
  activeSection: AdminConsoleSection;
  /** Window Y for the top edge of the panel (below the menu button). */
  anchorTop?: number;
  /** Distance from the right edge of the window. */
  anchorRight?: number;
  onClose: () => void;
  onSelect: (section: AdminConsoleSection) => void;
};

/** Dropdown under the Admin hamburger (right side) — section screens come later. */
export function AdminConsoleNavDrawer({
  visible,
  activeSection,
  anchorTop,
  anchorRight = 20,
  onClose,
  onSelect,
}: AdminConsoleNavDrawerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const top = typeof anchorTop === 'number' && Number.isFinite(anchorTop)
    ? anchorTop
    : modalTopInset(insets.top) + 120;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        testID="admin-console-nav-backdrop"
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel')}
        className="flex-1 bg-black/20"
        onPress={onClose}
      >
        <View
          testID="admin-console-nav-drawer"
          className="absolute w-64 overflow-hidden rounded-2xl border border-[#E8DFD0] bg-white shadow-xl"
          style={{ top, right: anchorRight, maxHeight: '68%' }}
          onStartShouldSetResponder={() => true}
        >
          <View className="border-b border-[#E8DFD0] px-4 py-3">
            <Text className="text-xs font-semibold uppercase tracking-wider text-[#8B7355]">
              {t('adminConsole.title')}
            </Text>
          </View>

          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 8 }}
          >
            {ADMIN_CONSOLE_NAV_ITEMS.map((item) => {
              const active = activeSection === item.key;
              return (
                <Pressable
                  key={item.key}
                  testID={`admin-console-nav-${item.key}-button`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(item.labelKey)}
                  className={`mb-0.5 flex-row items-center gap-3 rounded-xl px-3 py-2.5 ${
                    active ? 'bg-[#FFF1DE]' : 'bg-transparent'
                  }`}
                  onPress={() => {
                    onSelect(item.key);
                    onClose();
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={active ? BRAND.primary : '#D97706'}
                  />
                  <Text
                    className={`flex-1 text-sm font-medium ${
                      active ? 'text-[#B45309]' : 'text-[#5C4A3A]'
                    }`}
                  >
                    {t(item.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}
