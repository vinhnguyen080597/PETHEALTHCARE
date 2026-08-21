import CountryFlag from 'react-native-country-flag';
import { View } from 'react-native';

type LanguageCountryFlagProps = {
  isoCode: string;
  size?: number;
};

/** Thin wrapper so flag images stay rounded and consistent in chip / rows. */
export function LanguageCountryFlag({ isoCode, size = 18 }: LanguageCountryFlagProps) {
  return (
    <View className="overflow-hidden rounded-sm" style={{ width: size * 1.6, height: size }}>
      <CountryFlag isoCode={isoCode} size={size} style={{ borderRadius: 2 }} />
    </View>
  );
}
