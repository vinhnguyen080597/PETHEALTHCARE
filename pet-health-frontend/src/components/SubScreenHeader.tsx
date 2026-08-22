import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { BRAND } from '../theme/brand';

type SubScreenHeaderProps = {
  title: string;
  onBack: () => void;
  backTestID?: string;
};

/** Back-navigation header — matches AppHeader row height (py-3, h-9 controls). */
export function SubScreenHeader({ title, onBack, backTestID = 'sub-screen-back-button' }: SubScreenHeaderProps) {
  return (
    <View
      className="border-b px-5 py-3"
      style={{ backgroundColor: BRAND.card, borderBottomWidth: 1, borderBottomColor: BRAND.borderLight }}
    >
      <View className="flex-row items-center">
        <Pressable
          testID={backTestID}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="h-9 w-9 items-center justify-center rounded-full active:opacity-80"
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
        </Pressable>
        <Text
          className="flex-1 text-center text-lg font-bold"
          style={{ color: BRAND.textPrimary }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View className="h-9 w-9" />
      </View>
    </View>
  );
}
