import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const PRIMARY = '#1E6FE8';

type AccountScreenProps = {
  petCount: number;
  savedPostCount: number;
  onOpenBreederProfile: () => void;
  onOpenAdminReview: () => void;
  onLogout: () => void;
};

export function AccountScreen({ petCount, savedPostCount, onOpenBreederProfile, onOpenAdminReview, onLogout }: AccountScreenProps) {
  const { t } = useTranslation();
  return (
    <ScrollView testID="account-screen" className="flex-1 bg-[#F2F4F8] px-5 pb-6 pt-5">
      <Text className="text-2xl font-bold text-slate-900">{t('account.title')}</Text>
      <Text className="mt-1 text-sm leading-5 text-slate-600">{t('account.subtitle')}</Text>

      <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
        <Text className="text-base font-bold text-slate-900">{t('account.myRole')}</Text>
        <View className="mt-3 gap-3">
          {['sen', 'breeder', 'vet'].map((role) => (
            <View key={role} className="flex-row items-center gap-3 rounded-xl bg-slate-50 p-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <Ionicons
                  name={role === 'sen' ? 'heart-outline' : role === 'breeder' ? 'ribbon-outline' : 'medkit-outline'}
                  size={20}
                  color={PRIMARY}
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-slate-900">{t(`account.roles.${role}.title`)}</Text>
                <Text className="mt-1 text-sm leading-5 text-slate-600">{t(`account.roles.${role}.body`)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="mt-5 flex-row gap-3">
        <View className="flex-1 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-xs font-bold uppercase text-slate-500">{t('account.pets')}</Text>
          <Text className="mt-1 text-2xl font-bold text-slate-900">{petCount}</Text>
        </View>
        <View className="flex-1 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-xs font-bold uppercase text-slate-500">{t('account.savedPosts')}</Text>
          <Text className="mt-1 text-2xl font-bold text-slate-900">{savedPostCount}</Text>
        </View>
      </View>

      <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <Text className="text-sm leading-5 text-amber-900">{t('account.communitySafety')}</Text>
      </View>

      <View className="mt-5 gap-3">
        <Pressable
          testID="account-breeder-profile-button"
          accessibilityRole="button"
          accessibilityLabel="Open breeder profile"
          className="flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 active:opacity-90"
          onPress={onOpenBreederProfile}
        >
          <Ionicons name="ribbon-outline" size={19} color="#fff" />
          <Text className="text-sm font-bold text-white">{t('account.openBreederProfile')}</Text>
        </Pressable>
        <Pressable
          testID="account-admin-review-button"
          accessibilityRole="button"
          accessibilityLabel="Open admin review"
          className="flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 active:bg-slate-50"
          onPress={onOpenAdminReview}
        >
          <Ionicons name="shield-checkmark-outline" size={19} color={PRIMARY} />
          <Text className="text-sm font-bold" style={{ color: PRIMARY }}>{t('account.openAdminReview')}</Text>
        </Pressable>
      </View>

      <Pressable
        testID="account-logout-button"
        accessibilityRole="button"
        accessibilityLabel="Log out"
        className="mt-6 flex-row items-center justify-center gap-2 rounded-xl border border-red-100 bg-white py-3.5 active:bg-red-50"
        onPress={onLogout}
      >
        <Ionicons name="log-out-outline" size={19} color="#dc2626" />
        <Text className="text-sm font-bold text-red-600">{t('tabs.logout')}</Text>
      </Pressable>
    </ScrollView>
  );
}
