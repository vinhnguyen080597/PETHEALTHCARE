import { Platform } from 'react-native';
import {
  finishTransaction,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases as restoreStorePurchases,
  ErrorCode,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';
import { PREMIUM_MONTHLY_PRODUCT_ID } from '../constants/iapProducts';

export type IapPurchasePayload = {
  platform: 'ios' | 'android';
  productId: string;
  transactionId: string;
  purchaseToken: string | null;
  receiptData: string | null;
};

let initPromise: Promise<boolean> | null = null;
let listenersAttached = false;
let pendingPurchase:
  | {
      productId: string;
      resolve: (purchase: Purchase) => void;
      reject: (error: Error) => void;
    }
  | null = null;

function platformName(): 'ios' | 'android' | null {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return null;
}

export function isIapSupported(): boolean {
  return platformName() != null;
}

function isUserCancelled(error: PurchaseError): boolean {
  return error.code === ErrorCode.UserCancelled;
}

function attachPurchaseListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  purchaseUpdatedListener((purchase) => {
    if (!pendingPurchase) return;
    if (purchase.productId !== pendingPurchase.productId) return;
    pendingPurchase.resolve(purchase);
    pendingPurchase = null;
  });

  purchaseErrorListener((error) => {
    if (!pendingPurchase) return;
    if (error.productId && error.productId !== pendingPurchase.productId) return;
    const err = new Error(error.message || 'Purchase failed');
    if (isUserCancelled(error)) {
      (err as Error & { userCancelled?: boolean }).userCancelled = true;
    }
    pendingPurchase.reject(err);
    pendingPurchase = null;
  });
}

export async function initializeIap(): Promise<boolean> {
  if (!isIapSupported()) return false;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      attachPurchaseListeners();
      await initConnection();
      return true;
    } catch {
      return false;
    }
  })();

  return initPromise;
}

export function purchasePayloadFromStore(purchase: Purchase): IapPurchasePayload {
  const platform = platformName();
  if (!platform) {
    throw new Error('IAP is not supported on this platform');
  }

  const transactionId = String(purchase.transactionId || purchase.id || '');
  const purchaseToken =
    purchase.purchaseToken ??
    ('purchaseTokenAndroid' in purchase ? purchase.purchaseTokenAndroid : null) ??
    null;

  return {
    platform,
    productId: purchase.productId,
    transactionId,
    purchaseToken: purchaseToken ? String(purchaseToken) : null,
    receiptData: purchaseToken ? String(purchaseToken) : null,
  };
}

async function waitForPurchase(productId: string, productType: 'subs' | 'in-app'): Promise<Purchase> {
  return new Promise<Purchase>((resolve, reject) => {
    pendingPurchase = { productId, resolve, reject };

    void requestPurchase({
      type: productType,
      request: {
        apple: { sku: productId },
        google: { skus: [productId] },
      },
    }).catch((error: unknown) => {
      if (pendingPurchase?.productId === productId) {
        pendingPurchase = null;
        reject(error instanceof Error ? error : new Error('Purchase failed'));
      }
    });
  });
}

export async function purchasePremiumSubscription(
  verifyFn: (payload: IapPurchasePayload) => Promise<void>,
): Promise<{ ok: true } | { ok: false; cancelled?: boolean; message?: string }> {
  const ready = await initializeIap();
  if (!ready) {
    return { ok: false, message: 'IAP_UNAVAILABLE' };
  }

  try {
    const purchase = await waitForPurchase(PREMIUM_MONTHLY_PRODUCT_ID, 'subs');
    const payload = purchasePayloadFromStore(purchase);
    await verifyFn(payload);
    await finishTransaction({ purchase, isConsumable: false });
    return { ok: true };
  } catch (error: unknown) {
    const err = error as Error & { userCancelled?: boolean };
    if (err.userCancelled) {
      return { ok: false, cancelled: true };
    }
    return { ok: false, message: err.message || 'Purchase failed' };
  }
}

export async function restoreIapPurchases(
  verifyFn: (payload: IapPurchasePayload) => Promise<void>,
): Promise<{ restored: number; failed: number }> {
  const ready = await initializeIap();
  if (!ready) return { restored: 0, failed: 0 };

  await restoreStorePurchases();
  const { getAvailablePurchases } = await import('react-native-iap');
  const purchases = await getAvailablePurchases();
  let restored = 0;
  let failed = 0;

  for (const purchase of purchases) {
    try {
      const payload = purchasePayloadFromStore(purchase);
      await verifyFn(payload);
      const isConsumable = payload.productId.includes('.credits.');
      await finishTransaction({ purchase, isConsumable });
      restored += 1;
    } catch {
      failed += 1;
    }
  }

  return { restored, failed };
}
