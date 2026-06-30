/** Metro stub for Expo Go — real IAP requires a dev/production build. */

export const ErrorCode = {
  UserCancelled: 'user-cancelled',
} as const;

export async function initConnection(): Promise<boolean> {
  return false;
}

export function purchaseUpdatedListener(_listener: (purchase: unknown) => void) {
  return { remove: () => undefined };
}

export function purchaseErrorListener(_listener: (error: unknown) => void) {
  return { remove: () => undefined };
}

export async function requestPurchase(): Promise<void> {
  throw new Error('IAP is not available in Expo Go');
}

export async function restorePurchases(): Promise<void> {}

export async function getAvailablePurchases(): Promise<unknown[]> {
  return [];
}

export async function finishTransaction(): Promise<void> {}
