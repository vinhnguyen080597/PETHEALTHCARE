import type { AiCreditAccount } from '../types';

export type AiCreditFeature = 'health_analysis' | 'breed_recognition' | 'analysis_translation';

export function getFeatureTrialBalance(
  account: AiCreditAccount | null | undefined,
  feature: AiCreditFeature | string,
): number {
  return Number(account?.featureTrialBalance?.[feature] ?? 0);
}

export function hasCreditsForFeature(
  account: AiCreditAccount | null | undefined,
  feature: AiCreditFeature | string,
  cost: number,
): boolean {
  if (!account) return true;
  if (getFeatureTrialBalance(account, feature) >= cost) return true;
  return account.creditBalance >= cost;
}

export function getSpendableCreditsForFeature(
  account: AiCreditAccount | null | undefined,
  feature: AiCreditFeature | string,
): { trial: number; shared: number; total: number } {
  const trial = getFeatureTrialBalance(account, feature);
  const shared = Number(account?.creditBalance ?? 0);
  return { trial, shared, total: trial + shared };
}
