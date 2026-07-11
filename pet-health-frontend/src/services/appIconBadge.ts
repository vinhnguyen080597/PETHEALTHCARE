import { Platform } from 'react-native';

let notificationsModule: typeof import('expo-notifications') | null = null;

async function getNotificationsModule() {
  if (notificationsModule) return notificationsModule;
  if (Platform.OS === 'web') return null;
  try {
    notificationsModule = await import('expo-notifications');
    return notificationsModule;
  } catch {
    return null;
  }
}

export async function setAppIconBadgeCount(count: number): Promise<void> {
  const notifications = await getNotificationsModule();
  if (!notifications) return;

  const badgeCount = Math.max(0, Math.floor(count));
  try {
    await notifications.setBadgeCountAsync(badgeCount);
  } catch {
    // Badge APIs are unavailable in some dev clients and launchers.
  }
}

export async function clearAppIconBadge(): Promise<void> {
  await setAppIconBadgeCount(0);
}
