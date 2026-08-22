import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaiVaccinationDueModal } from '../components/MaiVaccinationDueModal';
import { NotificationBellBadge } from '../components/NotificationBellBadge';
import type { Pet } from '../types';
import { BRAND } from '../theme/brand';
import { buttonContainerStyle, buttonIconColor, buttonLabelStyle } from '../theme/buttonStyles';
import { formatPetAgeForDisplay } from '../utils/petAge';

type HomeScreenProps = {
  pets: Pet[];
  vaccinationDueCounts: Record<string, number>;
  vaccinationDuePopupVisible: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onAddPet: () => void;
  onViewProfile: (petId: string) => void;
  onOpenCareServices: (petId: string) => void;
  onOpenVaccinationDue: (petId: string) => void;
  onDismissVaccinationDuePopup: () => void;
};

function formatPetSubtitle(pet: Pet, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const breed = pet.breed?.trim();
  const speciesLabel = pet.species
    ? pet.species.charAt(0).toUpperCase() + pet.species.slice(1).toLowerCase()
    : t('home.petFallback');
  const breedPart = breed || speciesLabel;
  const agePart = formatPetAgeForDisplay(pet, t);
  return `${breedPart} • ${agePart}`;
}

function HomeActionButton({
  testID,
  accessibilityLabel,
  label,
  icon,
  variant,
  onPress,
  fullWidth = false,
}: {
  testID: string;
  accessibilityLabel: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant: 'primary' | 'secondary';
  onPress: () => void;
  fullWidth?: boolean;
}) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={`flex-row items-center justify-center rounded-full active:opacity-95 ${
        isPrimary ? 'bg-orange-500 px-6 py-3.5' : 'border border-orange-200 bg-orange-50 px-4 py-2'
      } ${fullWidth ? 'w-full max-w-sm' : ''}`}
      style={({ pressed }) => ({
        ...buttonContainerStyle(variant, pressed),
        ...(fullWidth ? { alignSelf: 'stretch' as const } : { alignSelf: 'center' as const }),
        minHeight: isPrimary ? 48 : 40,
      })}
      onPress={onPress}
    >
      <Ionicons name={icon} size={isPrimary ? 20 : 18} color={buttonIconColor(variant)} />
      <Text
        className={`ml-1.5 font-semibold ${isPrimary ? 'text-base text-white' : 'text-sm'}`}
        style={isPrimary ? undefined : buttonLabelStyle('secondary')}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Home — corner add is Secondary; card CTA is Primary when empty. */
export function HomeScreen({
  pets,
  vaccinationDueCounts,
  vaccinationDuePopupVisible,
  refreshing,
  onRefresh,
  onAddPet,
  onViewProfile,
  onOpenCareServices,
  onOpenVaccinationDue,
  onDismissVaccinationDuePopup,
}: HomeScreenProps) {
  const { t } = useTranslation();
  const firstPetCardRef = useRef<View>(null);
  const [popupTopOffset, setPopupTopOffset] = useState<number | null>(null);

  const measureFirstPetCardTop = useCallback(() => {
    firstPetCardRef.current?.measureInWindow((_x, y) => {
      if (Number.isFinite(y) && y >= 0) {
        setPopupTopOffset(y);
      }
    });
  }, []);

  useEffect(() => {
    if (!vaccinationDuePopupVisible || pets.length === 0) return;
    const id = requestAnimationFrame(() => measureFirstPetCardTop());
    return () => cancelAnimationFrame(id);
  }, [vaccinationDuePopupVisible, pets.length, measureFirstPetCardTop]);

  return (
    <>
      <ScrollView
        testID="home-screen"
        className="flex-1"
        style={{ backgroundColor: BRAND.appBackground }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.btnPrimary} />}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-xl font-bold" style={{ color: BRAND.textPrimary }}>
            {t('home.title')}
          </Text>
          <HomeActionButton
            testID="home-add-pet-button"
            accessibilityLabel="Add pet"
            label={t('home.addPet')}
            icon="add"
            variant="secondary"
            onPress={onAddPet}
          />
        </View>

        {pets.length === 0 ? (
          <View
            className="items-center rounded-2xl px-5 py-14"
            style={{ backgroundColor: BRAND.card, borderWidth: 1, borderColor: BRAND.borderCard }}
          >
            <View
              className="mb-4 h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: BRAND.surfaceLight }}
            >
              <Ionicons name="paw-outline" size={36} color={BRAND.btnPrimary} />
            </View>
            <Text className="mb-1 text-center text-base font-medium" style={{ color: BRAND.textPrimary }}>
              {t('home.noPetsTitle')}
            </Text>
            <Text className="mb-6 max-w-xs px-4 text-center text-sm" style={{ color: BRAND.textSecondary }}>
              {t('home.noPetsBody')}
            </Text>
            <HomeActionButton
              testID="home-add-first-pet-button"
              accessibilityLabel="Add first pet"
              label={t('home.addFirstPet')}
              icon="add"
              variant="primary"
              fullWidth
              onPress={onAddPet}
            />
            <Text className="mt-4 text-center text-xs" style={{ color: BRAND.textMuted }}>
              {t('home.pullToRefresh')}
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {pets.map((pet, index) => {
              const dueCount = vaccinationDueCounts[pet.id] ?? 0;
              return (
                <View
                  testID={`home-pet-card-${pet.id}`}
                  key={pet.id}
                  ref={index === 0 ? firstPetCardRef : undefined}
                  onLayout={index === 0 ? measureFirstPetCardTop : undefined}
                  className="overflow-hidden rounded-2xl p-3.5 shadow-sm"
                  style={{ backgroundColor: BRAND.card, borderWidth: 1, borderColor: BRAND.borderCard }}
                >
                  <View className="flex-row items-center gap-3.5">
                    <Pressable
                      testID={`home-pet-avatar-button-${pet.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={t('home.viewProfileFor', { name: pet.name })}
                      className="h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full active:opacity-90"
                      style={{ backgroundColor: BRAND.surfaceLight, borderWidth: 1, borderColor: BRAND.borderBrand }}
                      onPress={() => onViewProfile(pet.id)}
                    >
                      {pet.avatar_url ? (
                        <Image
                          source={{ uri: pet.avatar_url }}
                          style={{ height: '100%', width: '100%' }}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={120}
                        />
                      ) : (
                        <Ionicons name="paw" size={32} color={BRAND.btnPrimary} />
                      )}
                    </Pressable>
                    <Pressable
                      testID={`home-pet-name-button-${pet.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={t('home.viewProfileFor', { name: pet.name })}
                      className="min-w-0 flex-1 active:opacity-80"
                      onPress={() => onViewProfile(pet.id)}
                    >
                      <Text className="text-[17px] font-bold" style={{ color: BRAND.textPrimary }}>
                        {pet.name}
                      </Text>
                      <Text className="mt-0.5 text-[13px]" style={{ color: BRAND.textMuted }} numberOfLines={2}>
                        {formatPetSubtitle(pet, t)}
                      </Text>
                    </Pressable>
                    <Pressable
                      testID={`home-pet-vaccination-due-button-${pet.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={
                        dueCount > 0
                          ? t('home.vaccinationDueNotification', { name: pet.name, count: dueCount })
                          : t('home.openCoreCare')
                      }
                      className="flex-shrink-0 self-start active:opacity-80"
                      onPress={() => onOpenVaccinationDue(pet.id)}
                    >
                      <NotificationBellBadge count={dueCount} testID={`home-pet-vaccination-due-badge-${pet.id}`} />
                    </Pressable>
                  </View>

                  <View className="mt-3.5 flex-row gap-2.5">
                    <Pressable
                      testID={`home-view-profile-button-${pet.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`View profile for ${pet.name}`}
                      className="min-w-0 flex-1 items-center justify-center rounded-xl py-3 active:opacity-95"
                      style={({ pressed }) => buttonContainerStyle('outline', pressed)}
                      onPress={() => onViewProfile(pet.id)}
                    >
                      <Text className="text-[13px] font-semibold" style={buttonLabelStyle('outline')}>
                        {t('home.viewProfile')}
                      </Text>
                    </Pressable>
                    <Pressable
                      testID={`home-care-services-button-${pet.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Open care services for ${pet.name}`}
                      className="min-w-0 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-3 active:opacity-95"
                      style={({ pressed }) => buttonContainerStyle('secondary', pressed)}
                      onPress={() => onOpenCareServices(pet.id)}
                    >
                      <Ionicons name="sparkles-outline" size={16} color={buttonIconColor('secondary')} />
                      <Text className="text-[13px] font-semibold" style={buttonLabelStyle('secondary')} numberOfLines={1}>
                        {t('home.openCareServices')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      <MaiVaccinationDueModal
        visible={vaccinationDuePopupVisible}
        topOffset={popupTopOffset}
        onDismiss={onDismissVaccinationDuePopup}
      />
    </>
  );
}
