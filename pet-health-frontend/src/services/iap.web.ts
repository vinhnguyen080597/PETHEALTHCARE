import { Alert } from 'react-native';
import i18n from '../i18n';
import { PREMIUM_MONTHLY_PRODUCT_ID } from '../constants/iapProducts';

export function isIapSupported(): boolean {
  return false;
}

export async function initializeIap(): Promise<boolean> {
  return false;
}

export type IapPurchasePayload = {
  platform: 'ios' | 'android';
  productId: string;
  transactionId: string;
  purchaseToken: string | null;
  receiptData: string | null;
};

export async function purchasePremiumSubscription(
  _verifyFn: (payload: IapPurchasePayload) => Promise<void>,
): Promise<{ ok: true } | { ok: false; cancelled?: boolean; message?: string }> {
  Alert.alert(i18n.t('premium.title'), i18n.t('premium.mobileOnlyBody'));
  return { ok: false, message: 'IAP_WEB_UNSUPPORTED' };
}

export async function restoreIapPurchases(
  _verifyFn: (payload: IapPurchasePayload) => Promise<void>,
): Promise<{ restored: number; failed: number }> {
  Alert.alert(i18n.t('premium.title'), i18n.t('premium.mobileOnlyBody'));
  return { restored: 0, failed: 0 };
}

export { PREMIUM_MONTHLY_PRODUCT_ID };
