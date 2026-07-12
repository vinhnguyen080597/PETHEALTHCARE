import { Platform } from 'react-native';

let notificationsModule: typeof import('expo-notifications') | null = null;
let badgePermissionReady = false;

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

/** iOS requires allowBadge permission before setBadgeCountAsync can succeed. */
async function ensureBadgePermission(
  notifications: typeof import('expo-notifications'),
): Promise<boolean> {
  if (badgePermissionReady) return true;
  if (Platform.OS !== 'ios') {
    badgePermissionReady = true;
    return true;
  }

  try {
    const current = await notifications.getPermissionsAsync();
    const iosStatus = current.ios?.status;
    const badgeAllowed =
      current.granted ||
      iosStatus === notifications.IosAuthorizationStatus.AUTHORIZED ||
      iosStatus === notifications.IosAuthorizationStatus.PROVISIONAL ||
      current.ios?.allowsBadge === true;

    if (badgeAllowed && current.ios?.allowsBadge !== false) {
      badgePermissionReady = true;
      return true;
    }

    const requested = await notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: false,
      },
    });

    const ok =
      requested.granted ||
      requested.ios?.status === notifications.IosAuthorizationStatus.AUTHORIZED ||
      requested.ios?.status === notifications.IosAuthorizationStatus.PROVISIONAL ||
      requested.ios?.allowsBadge === true;

    badgePermissionReady = ok;
    return ok;
  } catch {
    return false;
  }
}

export async function setAppIconBadgeCount(count: number): Promise<void> {
  const notifications = await getNotificationsModule();
  if (!notifications) return;

  const badgeCount = Math.max(0, Math.floor(count));
  try {
    const allowed = await ensureBadgePermission(notifications);
    if (!allowed) return;

    await notifications.setBadgeCountAsync(badgeCount);
  } catch {
    // Badge APIs are unavailable in some dev clients and launchers.
  }
}

export async function clearAppIconBadge(): Promise<void> {
  await setAppIconBadgeCount(0);
}
