import { View } from 'react-native';

function FarmReviewCardSkeleton() {
  return (
    <View className="gap-2.5">
      <View className="flex-row items-start gap-2.5">
        <View className="h-10 w-10 shrink-0 rounded-full bg-[#E7D5C0]" />
        <View className="min-w-0 flex-1 gap-2">
          <View className="h-3.5 w-2/5 rounded-full bg-[#E7D5C0]" />
          <View className="h-3 w-24 rounded-full bg-[#F0E6D8]" />
        </View>
      </View>
      <View className="h-3.5 w-11/12 rounded-md bg-[#F0E6D8]" />
      <View className="h-3.5 w-3/5 rounded-md bg-[#F0E6D8]" />
      <View className="flex-row gap-2">
        <View className="h-[72px] w-[72px] rounded-[10px] bg-[#E7D5C0]" />
        <View className="h-[72px] w-[72px] rounded-[10px] bg-[#E7D5C0]" />
        <View className="h-[72px] w-[72px] rounded-[10px] bg-[#E7D5C0]" />
      </View>
    </View>
  );
}

export function FarmReviewSectionSkeleton() {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading reviews">
      <FarmReviewCardSkeleton />
    </View>
  );
}
