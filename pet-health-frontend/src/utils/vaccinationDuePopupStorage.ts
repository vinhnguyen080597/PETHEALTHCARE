import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'pet_health_vaccination_due_popup_day:';

function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

/** True when the vaccination-due popup was already shown for this user today. */
export async function hasShownVaccinationDuePopupToday(userId: string): Promise<boolean> {
  const stored = await AsyncStorage.getItem(storageKey(userId));
  return stored === localDateKey();
}

/** Persist that the popup was shown (or dismissed) today so it stays dormant until tomorrow. */
export async function markVaccinationDuePopupShownToday(userId: string): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), localDateKey());
}
