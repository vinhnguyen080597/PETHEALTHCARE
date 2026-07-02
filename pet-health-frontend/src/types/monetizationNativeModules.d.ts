declare module 'react-native-iap' {
  import type { NativeIapModule, NativePurchase, NativePurchaseError } from './monetizationNative';

  export type Purchase = NativePurchase;
  export type PurchaseError = NativePurchaseError;
  export const ErrorCode: NativeIapModule['ErrorCode'];
  export function initConnection(): Promise<boolean>;
  export function purchaseUpdatedListener(
    listener: (purchase: NativePurchase) => void,
  ): { remove: () => void };
  export function purchaseErrorListener(listener: (error: NativePurchaseError) => void): { remove: () => void };
  export function requestPurchase(options: Parameters<NativeIapModule['requestPurchase']>[0]): Promise<void>;
  export function finishTransaction(options: Parameters<NativeIapModule['finishTransaction']>[0]): Promise<void>;
  export function restorePurchases(): Promise<void>;
  export function getAvailablePurchases(): Promise<NativePurchase[]>;
}

declare module 'react-native-google-mobile-ads' {
  import type { NativeRewardedAdModule } from './monetizationNative';

  export const RewardedAd: NativeRewardedAdModule['RewardedAd'];
  export const RewardedAdEventType: NativeRewardedAdModule['RewardedAdEventType'];
  export const AdEventType: NativeRewardedAdModule['AdEventType'];
  export const TestIds: NativeRewardedAdModule['TestIds'];
  const mobileAds: NativeRewardedAdModule['default'];
  export default mobileAds;
}
