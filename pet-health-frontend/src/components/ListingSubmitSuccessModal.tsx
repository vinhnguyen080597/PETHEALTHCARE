import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BRAND } from '../theme/brand';

type ListingSubmitSuccessModalProps = {
  visible: boolean;
  onDismiss: () => void;
};

/** Centered success notice after a listing is submitted for admin review. */
export function ListingSubmitSuccessModal({ visible, onDismiss }: ListingSubmitSuccessModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View
        testID="listing-submit-success-modal"
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          className="absolute inset-0"
          onPress={onDismiss}
        />

        <View
          className="w-full max-w-[320px] overflow-hidden rounded-3xl bg-white"
          style={{
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.18,
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          <View className="h-1 w-full" style={{ backgroundColor: BRAND.btnPrimary }} />

          <View className="relative px-5 py-5">
            <Pressable
              testID="listing-submit-success-close"
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              hitSlop={12}
              className="absolute right-2.5 top-2.5 z-10 h-7 w-7 items-center justify-center"
              onPress={onDismiss}
            >
              <Ionicons name="close" size={18} color="#94A3B8" />
            </Pressable>

            <Text
              className="px-6 text-center text-[17px] font-extrabold leading-6"
              style={{ color: BRAND.btnPrimary }}
            >
              {t('createPetFeedPost.submitSuccessTitle')}
            </Text>
            <Text className="mt-2 px-4 text-center text-[13px] font-medium leading-5 text-slate-600">
              {t('createPetFeedPost.submitSuccessBody')}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
