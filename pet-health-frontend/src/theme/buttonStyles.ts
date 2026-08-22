import type { TextStyle, ViewStyle } from 'react-native';
import { BRAND } from './brand.ts';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';

/** Container styles for Primary / Secondary / Outline buttons. */
export function buttonContainerStyle(variant: ButtonVariant, pressed = false): ViewStyle {
  switch (variant) {
    case 'primary':
      return { backgroundColor: pressed ? BRAND.btnPrimaryActive : BRAND.btnPrimary };
    case 'secondary':
      return {
        backgroundColor: pressed ? BRAND.btnSecondaryPressed : BRAND.btnSecondary,
        borderWidth: 1,
        borderColor: BRAND.borderBrand,
      };
    case 'outline':
      return {
        backgroundColor: pressed ? BRAND.appBackground : BRAND.card,
        borderWidth: 1,
        borderColor: BRAND.borderCard,
      };
  }
}

/** Label styles paired with `buttonContainerStyle`. */
export function buttonLabelStyle(variant: ButtonVariant): TextStyle {
  switch (variant) {
    case 'primary':
      return { color: BRAND.textInverse, fontWeight: '600' as const };
    case 'secondary':
      return { color: BRAND.textBrandLink, fontWeight: '600' as const };
    case 'outline':
      return { color: BRAND.textPrimary, fontWeight: '600' as const };
  }
}

/** Icon tint for button variants. */
export function buttonIconColor(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
      return BRAND.textInverse;
    case 'secondary':
      return BRAND.textBrandLink;
    case 'outline':
      return BRAND.textMuted;
  }
}

/** Active bottom-tab pill: soft orange surface + brand border tint. */
export function tabActiveContainerStyle(): ViewStyle {
  return {
    backgroundColor: BRAND.btnSecondary,
    borderWidth: 1,
    borderColor: BRAND.borderBrand,
  };
}
