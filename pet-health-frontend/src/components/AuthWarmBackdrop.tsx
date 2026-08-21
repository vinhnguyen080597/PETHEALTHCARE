import { View } from 'react-native';
import { BRAND } from '../theme/brand';

/** Soft warm corner glow over #FCFBFA — avoids full-bleed medical blue. */
export function AuthWarmBackdrop() {
  return (
    <View pointerEvents="none" className="absolute inset-0 overflow-hidden">
      <View
        className="absolute -right-16 -top-20 h-56 w-56 rounded-full"
        style={{ backgroundColor: BRAND.primary, opacity: 0.12 }}
      />
      <View
        className="absolute -left-20 top-8 h-44 w-44 rounded-full"
        style={{ backgroundColor: BRAND.accent, opacity: 0.14 }}
      />
      <View
        className="absolute -bottom-10 right-10 h-36 w-36 rounded-full"
        style={{ backgroundColor: BRAND.primary, opacity: 0.06 }}
      />
    </View>
  );
}
