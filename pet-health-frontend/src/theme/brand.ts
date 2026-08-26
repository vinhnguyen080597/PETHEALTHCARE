/**
 * PetCare mobile design tokens — text, border, button, and surface scales.
 *
 * Text:     textPrimary · textSecondary · textMuted · textBrandLink · textInverse
 * Border:   borderLight · borderCard · borderBrand
 * Button:   btnPrimary · btnPrimaryActive · btnSecondary
 * Surface:  appBackground · card · surfaceLight
 * Loading:  loadingSpinner (full-page / overlay)
 */
export const BRAND = {
  // — Text —
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textBrandLink: '#EA580C',
  textInverse: '#FFFFFF',

  // — Border —
  borderLight: '#F1F5F9',
  borderCard: '#E2E8F0',
  borderBrand: '#FED7AA',

  // — Button —
  btnPrimary: '#F97316',
  btnPrimaryActive: '#EA580C',
  btnSecondary: '#FFF7ED',
  btnSecondaryPressed: '#FFEDD5',

  // — Surface —
  appBackground: '#F8FAFC',
  card: '#FFFFFF',
  surfaceLight: '#FFF7ED',

  /** Full-page / overlay ActivityIndicator (session boot, Suspense, LoadingOverlay). */
  loadingSpinner: '#F97316',

  // Auth / onboarding warm canvas (slightly cream vs app shell).
  surface: '#FCFBFA',
  surfaceMuted: '#F8F5F2',
  accent: '#F59E0B',
  inputBorder: '#E2E8F0',
  inputFocus: '#F97316',
  logout: '#EF4444',
  logoutPressed: '#DC2626',
  verified: '#059669',
  verifiedSoft: '#ECFDF5',

  /** Header chat/bell outline — matches web `text-stone-500`. */
  headerIcon: '#78716C',
  /** Header unread badge — matches web `#D97706`. */
  headerBadge: '#D97706',
  /** Header action press surface — matches web `hover:bg-amber-50`. */
  headerIconPress: '#FFFBEB',

  /** @deprecated Use `textPrimary`. */
  text: '#0F172A',
  /** @deprecated Use `textMuted`. */
  textSub: '#64748B',
  /** @deprecated Use `btnPrimary`. */
  primary: '#F97316',
  /** @deprecated Use `btnPrimaryActive`. */
  primaryPressed: '#EA580C',
  /** @deprecated Use `borderBrand`. */
  borderTint: '#FED7AA',
  /** @deprecated Use `surfaceLight`. */
  primarySoft: '#FFF7ED',
} as const;
