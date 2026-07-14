import { Image, Modal, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MAI_NOTI } from '../assets/maiAssets';

const PRIMARY_BLUE = '#1E6FE8';

type MaiVaccinationDueModalProps = {
  visible: boolean;
  /** Window Y of the first pet card top edge; aligns popup with that line. */
  topOffset?: number | null;
  onDismiss: () => void;
};

export function MaiVaccinationDueModal({ visible, topOffset, onDismiss }: MaiVaccinationDueModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View
        testID="mai-vaccination-due-modal"
        className="flex-1 bg-black/40 px-5"
        style={{ paddingTop: topOffset != null && topOffset > 0 ? topOffset : undefined }}
      >
        <View
          className={`w-full max-w-sm self-center items-center rounded-3xl bg-white px-6 pb-6 pt-6 ${
            topOffset != null && topOffset > 0 ? '' : 'mt-auto mb-auto'
          }`}
        >
          <Image
            source={MAI_NOTI}
            resizeMode="contain"
            accessibilityLabel="Mai"
            style={{ width: 168, height: 168 }}
          />
          <Text className="mt-4 text-center text-base font-semibold leading-6 text-slate-800">
            {t('home.vaccinationDuePopupMessage')}
          </Text>
          <Pressable
            testID="mai-vaccination-due-check-button"
            accessibilityRole="button"
            accessibilityLabel={t('home.vaccinationDuePopupAction')}
            className="mt-6 w-full rounded-full py-3.5 active:opacity-90"
            style={{ backgroundColor: PRIMARY_BLUE }}
            onPress={onDismiss}
          >
            <Text className="text-center text-sm font-bold text-white">
              {t('home.vaccinationDuePopupAction')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
