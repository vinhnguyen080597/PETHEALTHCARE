import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export const ADMIN_CONSOLE_SECTIONS = [
  'home',
  'requests',
  'listings',
  'breeders',
  'reports',
  'history',
  'users',
  'features',
  'news',
] as const;

export type AdminConsoleSection = (typeof ADMIN_CONSOLE_SECTIONS)[number];

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type AdminConsoleNavItem = {
  key: AdminConsoleSection;
  labelKey: string;
  icon: IoniconName;
};

/** Mirrors web `ADMIN_NAV_ITEMS` in pet-health-web/src/lib/admin/consoleNav.ts */
export const ADMIN_CONSOLE_NAV_ITEMS: AdminConsoleNavItem[] = [
  { key: 'home', labelKey: 'adminConsole.nav.home', icon: 'home-outline' },
  { key: 'requests', labelKey: 'adminConsole.nav.requests', icon: 'arrow-down-outline' },
  { key: 'listings', labelKey: 'adminConsole.nav.listings', icon: 'diamond-outline' },
  { key: 'breeders', labelKey: 'adminConsole.nav.breeders', icon: 'ellipse-outline' },
  { key: 'reports', labelKey: 'adminConsole.nav.reports', icon: 'alert-outline' },
  { key: 'history', labelKey: 'adminConsole.nav.history', icon: 'menu-outline' },
  { key: 'users', labelKey: 'adminConsole.nav.users', icon: 'radio-button-on-outline' },
  { key: 'features', labelKey: 'adminConsole.nav.features', icon: 'flag-outline' },
  { key: 'news', labelKey: 'adminConsole.nav.news', icon: 'create-outline' },
];

export function isAdminConsoleSection(value: string | null | undefined): value is AdminConsoleSection {
  return (ADMIN_CONSOLE_SECTIONS as readonly string[]).includes(String(value || ''));
}
