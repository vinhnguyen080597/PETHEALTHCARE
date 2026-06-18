import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AccountProfile, Pet, UserRole } from '../types';

const ROLE_OPTIONS: UserRole[] = ['sen', 'breeder', 'admin'];

type AdminUserDetailScreenProps = {
  account: AccountProfile;
  pets: Pet[];
  loading: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onUpdateRole: (role: UserRole) => Promise<void>;
  onAddPet: () => void;
  onActAsUser: () => void;
};

export function AdminUserDetailScreen({
  account,
  pets,
  loading,
  onBack,
  onRefresh,
  onUpdateRole,
  onAddPet,
  onActAsUser,
}: AdminUserDetailScreenProps) {
  const { t } = useTranslation();

  return (
    <View testID="admin-user-detail-screen" className="flex-1 bg-[#F2F4F8]">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
        <Pressable testID="admin-user-detail-back-button" className="w-14 rounded-lg p-2" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{account.display_name || account.login_identifier}</Text>
        <Pressable className="w-14 items-center rounded-lg p-2" onPress={onRefresh} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#2563eb" /> : <Ionicons name="refresh-outline" size={22} color="#2563eb" />}
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
        <View className="rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-sm text-slate-500">{account.email ?? account.login_identifier}</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {ROLE_OPTIONS.map((role) => (
              <Pressable key={role} className={`rounded-full px-3 py-2 ${account.primary_role === role ? 'bg-blue-600' : 'bg-slate-100'}`} onPress={() => void onUpdateRole(role)}>
                <Text className={`text-xs font-bold ${account.primary_role === role ? 'text-white' : 'text-slate-700'}`}>{t(`account.roles.${role}.title`)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="mt-5 flex-row items-center justify-between">
          <Text className="text-base font-bold text-slate-900">{t('adminHub.petsTitle', { count: pets.length })}</Text>
          <Pressable className="flex-row items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 active:opacity-90" onPress={onAddPet}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text className="text-xs font-bold text-white">{t('adminHub.addPet')}</Text>
          </Pressable>
        </View>

        <View className="mt-3 gap-3">
          {pets.length === 0 ? <Text className="rounded-2xl bg-white p-4 text-sm text-slate-500">{t('adminHub.noPets')}</Text> : null}
          {pets.map((pet) => (
            <View key={pet.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <Text className="font-bold text-slate-900">{pet.name}</Text>
              <Text className="mt-1 text-sm text-slate-600">{[pet.species, pet.breed].filter(Boolean).join(' • ')}</Text>
            </View>
          ))}
        </View>

        <Pressable className="mt-6 flex-row items-center justify-center gap-2 rounded-xl bg-slate-800 py-3.5 active:opacity-90" onPress={onActAsUser}>
          <Ionicons name="person-outline" size={18} color="#fff" />
          <Text className="text-sm font-bold text-white">{t('adminHub.actAsUser')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
