import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

function Bone({ className }: { className: string }) {
  return <View className={`bg-slate-200 ${className}`} />;
}

/** Placeholder layout while account role / farm dashboard is loading. */
export function AccountScreenSkeleton() {
  const { t } = useTranslation();
  return (
    <View
      testID="account-screen-skeleton"
      accessibilityRole="progressbar"
      accessibilityLabel={t('common.loading')}
      className="flex-1 bg-[#FCFBFA] px-5 pt-5"
    >
      <View className="gap-2">
        <Bone className="h-8 w-36 rounded-lg" />
        <Bone className="h-4 w-64 rounded-full" />
      </View>

      <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
        <View className="flex-row items-center gap-3">
          <Bone className="h-14 w-14 rounded-full" />
          <View className="min-w-0 flex-1 gap-2">
            <Bone className="h-4 w-40 rounded-full" />
            <Bone className="h-3.5 w-52 rounded-full" />
          </View>
        </View>
      </View>

      <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
        <View className="flex-row items-start gap-3">
          <Bone className="h-11 w-11 rounded-full" />
          <View className="min-w-0 flex-1 gap-2">
            <Bone className="h-4 w-32 rounded-full" />
            <Bone className="h-3.5 w-48 rounded-full" />
            <Bone className="h-3 w-56 rounded-full" />
          </View>
        </View>
        <Bone className="mt-4 h-11 w-full rounded-xl" />
      </View>

      <View className="mt-5 flex-row gap-3">
        <Bone className="h-20 flex-1 rounded-2xl" />
        <Bone className="h-20 flex-1 rounded-2xl" />
        <Bone className="h-20 flex-1 rounded-2xl" />
      </View>

      <Bone className="mt-5 h-12 w-full rounded-xl" />
      <Bone className="mt-5 h-16 w-full rounded-2xl" />

      <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
        <Bone className="mb-3 h-4 w-36 rounded-full" />
        <View className="gap-3">
          <Bone className="h-16 w-full rounded-xl" />
          <Bone className="h-16 w-full rounded-xl" />
        </View>
      </View>
    </View>
  );
}
