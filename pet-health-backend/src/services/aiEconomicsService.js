import { randomUUID } from 'node:crypto';
import { listIapCatalog } from '../config/iapCatalog.js';

/** @deprecated Legacy generic trial pool (pre feature-specific trials). Used only for migration. */
const LEGACY_INITIAL_TRIAL_POOL = 2;
const DEFAULT_INITIAL_TRIAL_CREDITS = numberFromEnv('AI_INITIAL_TRIAL_CREDITS', 0);
const DEFAULT_FREE_MONTHLY_CREDITS = numberFromEnv('AI_FREE_MONTHLY_CREDITS', 0);
const FEATURE_TRIAL_DEFAULTS = {
  health_analysis: numberFromEnv('AI_TRIAL_CREDITS_HEALTH_ANALYSIS', 1),
  breed_recognition: numberFromEnv('AI_TRIAL_CREDITS_BREED_RECOGNITION', 1),
};
const DEFAULT_PLAN_TIER = process.env.AI_DEFAULT_PLAN_TIER || 'free';
const GLOBAL_DAILY_BUDGET_USD = numberFromEnv('AI_GLOBAL_DAILY_BUDGET_USD', 10);
const GLOBAL_MONTHLY_BUDGET_USD = numberFromEnv('AI_GLOBAL_MONTHLY_BUDGET_USD', 200);
const REWARDED_AD_CREDITS = numberFromEnv('AI_REWARDED_AD_CREDITS', 1);
const REWARDED_AD_DAILY_CAP = numberFromEnv('AI_REWARDED_AD_DAILY_CAP', 0);

const FEATURE_DEFAULTS = {
  health_analysis: { credits: 1, inputTokens: 7000, outputTokens: 1200 },
  breed_recognition: { credits: 1, inputTokens: 6500, outputTokens: 900 },
  analysis_translation: { credits: 0.25, inputTokens: 1800, outputTokens: 1200 },
};

const PAID_MODEL_PRICING = {
  inputUsdPer1M: numberFromEnv('AI_ESTIMATE_INPUT_USD_PER_1M', 0.25),
  outputUsdPer1M: numberFromEnv('AI_ESTIMATE_OUTPUT_USD_PER_1M', 1.5),
};

const memoryAccounts = new Map();
const memoryLedger = [];
const memoryUsage = [];
let supabaseDisabled = false;

function numberFromEnv(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function envKeyForFeature(feature) {
  return String(feature || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function featureConfig(feature) {
  const base = FEATURE_DEFAULTS[feature] ?? FEATURE_DEFAULTS.health_analysis;
  const key = String(feature || 'health_analysis').toUpperCase();
  return {
    ...base,
    credits: numberFromEnv(`AI_CREDITS_${key}`, base.credits),
  };
}

function nextMonthlyResetDate(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

function isMissingEconomicsTable(error) {
  if (!error) return false;
  const text = [error.message, error.details, error.hint, String(error.code ?? '')].filter(Boolean).join(' ');
  return /ai_credit_accounts|ai_credit_ledger|ai_usage_events|42P01|PGRST205|relation .* does not exist/i.test(text);
}

function nowIso() {
  return new Date().toISOString();
}

function startOfDayIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)).toISOString();
}

function startOfMonthIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString();
}

function defaultFeatureTrialBalance() {
  return {
    health_analysis: FEATURE_TRIAL_DEFAULTS.health_analysis,
    breed_recognition: FEATURE_TRIAL_DEFAULTS.breed_recognition,
  };
}

function createDefaultAccount(userId) {
  const now = new Date();
  return {
    user_id: userId,
    plan_tier: DEFAULT_PLAN_TIER,
    credit_balance: DEFAULT_INITIAL_TRIAL_CREDITS,
    feature_trial_balance: defaultFeatureTrialBalance(),
    monthly_allowance: DEFAULT_FREE_MONTHLY_CREDITS,
    monthly_reset_at: nextMonthlyResetDate(now).toISOString(),
    updated_at: now.toISOString(),
  };
}

function normalizeFeatureTrialBalance(raw) {
  const defaults = defaultFeatureTrialBalance();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaults;
  }
  return {
    health_analysis: Number(raw.health_analysis ?? defaults.health_analysis),
    breed_recognition: Number(raw.breed_recognition ?? defaults.breed_recognition),
  };
}

function normalizeAccount(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    planTier: row.plan_tier || DEFAULT_PLAN_TIER,
    creditBalance: Number(row.credit_balance ?? 0),
    featureTrialBalance: normalizeFeatureTrialBalance(row.feature_trial_balance),
    monthlyAllowance: Number(row.monthly_allowance ?? DEFAULT_FREE_MONTHLY_CREDITS),
    monthlyResetAt: row.monthly_reset_at,
    updatedAt: row.updated_at,
  };
}

function hasFeatureTrialBalance(row) {
  const trials = row?.feature_trial_balance;
  return trials && typeof trials === 'object' && !Array.isArray(trials);
}

function getAvailableCreditsForFeature(row, feature) {
  const trials = normalizeFeatureTrialBalance(row.feature_trial_balance);
  const trial = Number(trials[feature] ?? 0);
  const general = Number(row.credit_balance ?? 0);
  return { trial, general, total: trial + general };
}

function applyCreditReservation(row, feature, amount) {
  const trials = normalizeFeatureTrialBalance(row.feature_trial_balance);
  let balance = Number(row.credit_balance ?? 0);
  let fromTrial = 0;
  let fromGeneral = 0;
  let remaining = amount;

  const trialAvailable = Number(trials[feature] ?? 0);
  if (trialAvailable > 0 && remaining > 0) {
    fromTrial = Math.min(trialAvailable, remaining);
    trials[feature] = Number((trialAvailable - fromTrial).toFixed(2));
    remaining -= fromTrial;
  }

  if (remaining > 0) {
    fromGeneral = remaining;
    balance = Number((balance - fromGeneral).toFixed(2));
  }

  return {
    next: {
      ...row,
      feature_trial_balance: trials,
      credit_balance: balance,
      updated_at: nowIso(),
    },
    fromTrial,
    fromGeneral,
  };
}

async function ensureFeatureTrialBalance(row, userId) {
  if (hasFeatureTrialBalance(row)) {
    return {
      ...row,
      feature_trial_balance: normalizeFeatureTrialBalance(row.feature_trial_balance),
    };
  }

  const trials = defaultFeatureTrialBalance();
  const ledger = await listLedgerRowsForUser(userId);
  const reserves = ledger.filter((entry) => entry.reason === 'ai_reserve' && Number(entry.delta) < 0);

  for (const feature of Object.keys(trials)) {
    if (reserves.some((entry) => entry.feature === feature)) {
      trials[feature] = 0;
    }
  }

  let balance = Number(row.credit_balance ?? 0);
  if (reserves.length === 0 && balance > 0 && balance <= LEGACY_INITIAL_TRIAL_POOL) {
    balance = 0;
  } else if (reserves.length > 0 && balance > 0) {
    const usedLegacySlots = Math.min(reserves.length, LEGACY_INITIAL_TRIAL_POOL);
    if (balance <= LEGACY_INITIAL_TRIAL_POOL - usedLegacySlots) {
      balance = 0;
    }
  }

  return {
    ...row,
    feature_trial_balance: trials,
    credit_balance: balance,
    updated_at: nowIso(),
  };
}

function maybeResetAccount(row) {
  if (Number(row.monthly_allowance ?? 0) <= 0) return row;
  const resetAt = row.monthly_reset_at ? new Date(row.monthly_reset_at).getTime() : 0;
  if (resetAt > Date.now()) return row;
  const allowance = Number(row.monthly_allowance ?? DEFAULT_FREE_MONTHLY_CREDITS);
  return {
    ...row,
    credit_balance: allowance,
    monthly_allowance: allowance,
    monthly_reset_at: nextMonthlyResetDate().toISOString(),
    updated_at: nowIso(),
  };
}

function sumUsageRows(rows, predicate = () => true) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row && row.status === 'ok' && !row.cached && predicate(row))
    .reduce((sum, row) => sum + Number(row.estimated_cost_usd ?? 0), 0);
}

async function listUsageRowsSince(iso) {
  const supabase = supabaseDisabled ? null : getSupabaseServiceClient();
  if (!supabase) {
    return memoryUsage.filter((row) => String(row.created_at) >= iso);
  }
  const { data, error } = await supabase
    .from('ai_usage_events')
    .select('feature,status,cached,estimated_cost_usd,created_at')
    .gte('created_at', iso);
  if (error) {
    if (isMissingEconomicsTable(error)) {
      supabaseDisabled = true;
      return listUsageRowsSince(iso);
    }
    throw error;
  }
  return data ?? [];
}

async function checkGlobalAiBudget(feature, estimate) {
  const featureDailyBudget = numberFromEnv(`AI_FEATURE_DAILY_BUDGET_USD_${envKeyForFeature(feature)}`, 0);
  const todayRows = await listUsageRowsSince(startOfDayIso());
  const todaySpend = sumUsageRows(todayRows);
  const projectedDaily = todaySpend + estimate.estimatedCostUsd;
  if (GLOBAL_DAILY_BUDGET_USD > 0 && projectedDaily > GLOBAL_DAILY_BUDGET_USD) {
    return {
      ok: false,
      status: 503,
      code: 'AI_APP_BUDGET_EXHAUSTED',
      error: 'Free AI capacity is used up for today. Please try again later or use paid credits.',
      budgetWindow: 'day',
      budgetUsd: GLOBAL_DAILY_BUDGET_USD,
      projectedSpendUsd: Number(projectedDaily.toFixed(6)),
    };
  }

  if (featureDailyBudget > 0) {
    const featureSpend = sumUsageRows(todayRows, (row) => row.feature === feature);
    const projectedFeature = featureSpend + estimate.estimatedCostUsd;
    if (projectedFeature > featureDailyBudget) {
      return {
        ok: false,
        status: 503,
        code: 'AI_FEATURE_BUDGET_EXHAUSTED',
        error: 'Free AI capacity for this feature is used up for today.',
        budgetWindow: 'day',
        feature,
        budgetUsd: featureDailyBudget,
        projectedSpendUsd: Number(projectedFeature.toFixed(6)),
      };
    }
  }

  const monthRows = await listUsageRowsSince(startOfMonthIso());
  const monthSpend = sumUsageRows(monthRows);
  const projectedMonthly = monthSpend + estimate.estimatedCostUsd;
  if (GLOBAL_MONTHLY_BUDGET_USD > 0 && projectedMonthly > GLOBAL_MONTHLY_BUDGET_USD) {
    return {
      ok: false,
      status: 503,
      code: 'AI_APP_BUDGET_EXHAUSTED',
      error: 'Free AI capacity is used up for this month.',
      budgetWindow: 'month',
      budgetUsd: GLOBAL_MONTHLY_BUDGET_USD,
      projectedSpendUsd: Number(projectedMonthly.toFixed(6)),
    };
  }

  return { ok: true };
}

async function getAccountRow(userId) {
  const supabase = supabaseDisabled ? null : getSupabaseServiceClient();
  if (!supabase) {
    const current = memoryAccounts.get(userId) ?? createDefaultAccount(userId);
    const reset = maybeResetAccount(current);
    const next = await ensureFeatureTrialBalance(reset, userId);
    memoryAccounts.set(userId, next);
    return next;
  }

  try {
    const { data, error } = await supabase.from('ai_credit_accounts').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    let row = data ?? createDefaultAccount(userId);
    row = maybeResetAccount(row);
    row = await ensureFeatureTrialBalance(row, userId);
    const { data: saved, error: upsertError } = await supabase
      .from('ai_credit_accounts')
      .upsert(row, { onConflict: 'user_id' })
      .select('*')
      .single();
    if (upsertError) throw upsertError;
    return saved;
  } catch (error) {
    if (isMissingEconomicsTable(error)) {
      supabaseDisabled = true;
      console.warn('[ai-economics] tables missing; using in-memory credits until schema is applied');
      return getAccountRow(userId);
    }
    throw error;
  }
}

async function saveAccountRow(row) {
  const supabase = supabaseDisabled ? null : getSupabaseServiceClient();
  if (!supabase) {
    memoryAccounts.set(row.user_id, row);
    return row;
  }
  const { data, error } = await supabase.from('ai_credit_accounts').upsert(row, { onConflict: 'user_id' }).select('*').single();
  if (error) {
    if (isMissingEconomicsTable(error)) {
      supabaseDisabled = true;
      memoryAccounts.set(row.user_id, row);
      return row;
    }
    throw error;
  }
  return data;
}

async function insertLedger(row) {
  const supabase = supabaseDisabled ? null : getSupabaseServiceClient();
  if (!supabase) {
    memoryLedger.push(row);
    return row;
  }
  const { error } = await supabase.from('ai_credit_ledger').insert(row);
  if (error) {
    if (isMissingEconomicsTable(error)) {
      supabaseDisabled = true;
      memoryLedger.push(row);
      return row;
    }
    throw error;
  }
  return row;
}

export function estimateAiUsage(feature, details = {}) {
  const cfg = featureConfig(feature);
  const imageCount = Math.max(0, Number(details.imageCount ?? 0) || 0);
  const recordCount = Math.max(1, Number(details.recordCount ?? 1) || 1);
  let inputTokens = cfg.inputTokens;
  let outputTokens = cfg.outputTokens;

  if (feature === 'health_analysis') {
    inputTokens = 2500 + imageCount * 900 + (details.hasVideo ? 2500 : 0);
    outputTokens = 1200;
  } else if (feature === 'breed_recognition') {
    inputTokens = 2200 + imageCount * 800;
    outputTokens = 900;
  } else if (feature === 'analysis_translation') {
    inputTokens = 1200 * recordCount;
    outputTokens = 900 * recordCount;
  }

  const estimatedCostUsd =
    (inputTokens / 1_000_000) * PAID_MODEL_PRICING.inputUsdPer1M +
    (outputTokens / 1_000_000) * PAID_MODEL_PRICING.outputUsdPer1M;

  return {
    feature,
    creditCost: cfg.credits,
    estimatedInputTokens: Math.round(inputTokens),
    estimatedOutputTokens: Math.round(outputTokens),
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
    pricing: PAID_MODEL_PRICING,
  };
}

export async function getAiCreditSummary(userId) {
  const row = await getAccountRow(userId);
  return normalizeAccount(row);
}

export async function reserveAiCredits({ userId, feature, petId = null, details = {}, metadata = {} }) {
  const estimate = estimateAiUsage(feature, details);
  const budget = await checkGlobalAiBudget(feature, estimate);
  if (!budget.ok) return { ...budget, estimate };
  const amount = estimate.creditCost;
  if (amount <= 0) {
    return { ok: true, skipped: true, reservationId: null, amount: 0, estimate, account: await getAiCreditSummary(userId) };
  }

  const row = await getAccountRow(userId);
  const { trial, general, total } = getAvailableCreditsForFeature(row, feature);
  if (total < amount) {
    const account = normalizeAccount(row);
    return {
      ok: false,
      status: 402,
      code: 'AI_CREDITS_EXHAUSTED',
      error: 'You have used your available AI credits.',
      creditBalance: general,
      featureTrialBalance: account.featureTrialBalance,
      featureTrialRemaining: trial,
      creditCost: amount,
      monthlyResetAt: row.monthly_reset_at,
      estimate,
      feature,
    };
  }

  const reservationId = randomUUID();
  const { next, fromTrial, fromGeneral } = applyCreditReservation(row, feature, amount);
  await saveAccountRow(next);
  await insertLedger({
    id: reservationId,
    user_id: userId,
    delta: -amount,
    reason: 'ai_reserve',
    feature,
    pet_id: petId,
    metadata: { ...metadata, estimate, fromTrial, fromGeneral },
    created_at: nowIso(),
  });
  return {
    ok: true,
    userId,
    feature,
    petId,
    reservationId,
    amount,
    fromTrial,
    fromGeneral,
    estimate,
    account: normalizeAccount(next),
  };
}

async function listLedgerRowsForUser(userId, sinceIso = null) {
  const supabase = supabaseDisabled ? null : getSupabaseServiceClient();
  if (!supabase) {
    return memoryLedger
      .filter((row) => row.user_id === userId && (!sinceIso || String(row.created_at) >= sinceIso))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  let query = supabase.from('ai_credit_ledger').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (sinceIso) query = query.gte('created_at', sinceIso);
  const { data, error } = await query;
  if (error) {
    if (isMissingEconomicsTable(error)) {
      supabaseDisabled = true;
      return listLedgerRowsForUser(userId, sinceIso);
    }
    throw error;
  }
  return data ?? [];
}

export async function listAiCreditLedger(userId) {
  return listLedgerRowsForUser(userId);
}

export async function grantAiCredits({ userId, amount, reason, metadata = {} }) {
  const creditAmount = Number(amount);
  if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
    const err = new Error('amount must be positive');
    err.status = 400;
    err.code = 'INVALID_CREDIT_AMOUNT';
    throw err;
  }
  const row = await getAccountRow(userId);
  const next = {
    ...row,
    credit_balance: Number((Number(row.credit_balance ?? 0) + creditAmount).toFixed(2)),
    updated_at: nowIso(),
  };
  await saveAccountRow(next);
  await insertLedger({
    id: randomUUID(),
    user_id: userId,
    delta: creditAmount,
    reason,
    feature: null,
    pet_id: null,
    metadata,
    created_at: nowIso(),
  });
  return normalizeAccount(next);
}

export async function claimRewardedAdCredits(userId) {
  const todayRows = await listLedgerRowsForUser(userId, startOfDayIso());
  const claimedToday = todayRows.filter((row) => row.reason === 'ad_reward').length;
  if (REWARDED_AD_DAILY_CAP > 0 && claimedToday >= REWARDED_AD_DAILY_CAP) {
    return {
      ok: false,
      status: 429,
      code: 'AD_REWARD_DAILY_CAP',
      error: 'Daily rewarded ad credit limit reached.',
      dailyCap: REWARDED_AD_DAILY_CAP,
    };
  }
  const account = await grantAiCredits({
    userId,
    amount: REWARDED_AD_CREDITS,
    reason: 'ad_reward',
    metadata: { source: 'rewarded_ad', dailyCap: REWARDED_AD_DAILY_CAP || null },
  });
  const remainingToday =
    REWARDED_AD_DAILY_CAP > 0 ? REWARDED_AD_DAILY_CAP - claimedToday - 1 : null;
  return { ok: true, account, grantedCredits: REWARDED_AD_CREDITS, remainingToday };
}

export async function hasProcessedIapTransaction(userId, transactionId) {
  const id = String(transactionId || '').trim();
  if (!id) return false;
  const rows = await listLedgerRowsForUser(userId);
  return rows.some((row) => {
    if (!['iap_purchase', 'subscription_purchase', 'subscription_renewal'].includes(row.reason)) return false;
    const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    return String(meta.transactionId || '') === id;
  });
}

export async function activatePremiumSubscription(
  userId,
  { transactionId, productId, monthlyCredits, planTier = 'premium', metadata = {} },
) {
  const credits = Number(monthlyCredits);
  if (!Number.isFinite(credits) || credits <= 0) {
    const err = new Error('monthlyCredits must be positive');
    err.status = 400;
    err.code = 'INVALID_SUBSCRIPTION_CREDITS';
    throw err;
  }
  if (await hasProcessedIapTransaction(userId, transactionId)) {
    return getAiCreditSummary(userId);
  }

  const row = await getAccountRow(userId);
  const next = {
    ...row,
    plan_tier: planTier,
    monthly_allowance: credits,
    credit_balance: credits,
    monthly_reset_at: nextMonthlyResetDate().toISOString(),
    updated_at: nowIso(),
  };
  await saveAccountRow(next);
  await insertLedger({
    id: randomUUID(),
    user_id: userId,
    delta: credits,
    reason: 'subscription_purchase',
    feature: null,
    pet_id: null,
    metadata: { transactionId, productId, ...metadata },
    created_at: nowIso(),
  });
  return normalizeAccount(next);
}

export async function fulfillIapConsumable(userId, { transactionId, productId, credits, metadata = {} }) {
  const creditAmount = Number(credits);
  if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
    const err = new Error('credits must be positive');
    err.status = 400;
    err.code = 'INVALID_IAP_CREDITS';
    throw err;
  }
  if (await hasProcessedIapTransaction(userId, transactionId)) {
    return getAiCreditSummary(userId);
  }
  return grantAiCredits({
    userId,
    amount: creditAmount,
    reason: 'iap_purchase',
    metadata: { transactionId, productId, ...metadata },
  });
}

export async function refundAiCredits(reservation, reason = 'ai_refund') {
  if (!reservation?.ok || !reservation.reservationId || !(reservation.amount > 0)) return null;
  const userId = reservation.userId;
  if (!userId) return null;

  const row = await getAccountRow(userId);
  const trials = normalizeFeatureTrialBalance(row.feature_trial_balance);
  let balance = Number(row.credit_balance ?? 0);
  const feature = reservation.feature;

  if (reservation.fromTrial > 0 && feature) {
    trials[feature] = Number((Number(trials[feature] ?? 0) + reservation.fromTrial).toFixed(2));
  }
  if (reservation.fromGeneral > 0) {
    balance = Number((balance + reservation.fromGeneral).toFixed(2));
  } else if (!(reservation.fromTrial > 0)) {
    balance = Number((balance + reservation.amount).toFixed(2));
  }

  const next = {
    ...row,
    feature_trial_balance: trials,
    credit_balance: balance,
    updated_at: nowIso(),
  };
  await saveAccountRow(next);
  await insertLedger({
    id: randomUUID(),
    user_id: userId,
    delta: reservation.amount,
    reason,
    feature: reservation.feature ?? null,
    pet_id: reservation.petId ?? null,
    metadata: { reservationId: reservation.reservationId },
    created_at: nowIso(),
  });
  return normalizeAccount(next);
}

export async function recordAiUsageEvent({
  userId,
  petId = null,
  feature,
  status,
  cached = false,
  reservation = null,
  estimate = null,
  model = null,
  metadata = {},
}) {
  const est = estimate ?? estimateAiUsage(feature, metadata);
  const row = {
    id: randomUUID(),
    user_id: userId,
    pet_id: petId,
    feature,
    model,
    status,
    cached,
    credit_cost: reservation?.amount ?? 0,
    estimated_input_tokens: est.estimatedInputTokens,
    estimated_output_tokens: est.estimatedOutputTokens,
    estimated_cost_usd: est.estimatedCostUsd,
    metadata,
    created_at: nowIso(),
  };

  const supabase = supabaseDisabled ? null : getSupabaseServiceClient();
  if (!supabase) {
    memoryUsage.push(row);
    return row;
  }
  const { error } = await supabase.from('ai_usage_events').insert(row);
  if (error) {
    if (isMissingEconomicsTable(error)) {
      supabaseDisabled = true;
      memoryUsage.push(row);
      return row;
    }
    throw error;
  }
  return row;
}

export function attachReservationContext(reservation, context) {
  if (!reservation || !context) return reservation;
  return { ...reservation, ...context };
}

export function getAiEconomicsConfig() {
  return {
    freeMonthlyCredits: DEFAULT_FREE_MONTHLY_CREDITS,
    initialTrialCredits: DEFAULT_INITIAL_TRIAL_CREDITS,
    featureTrialCredits: { ...FEATURE_TRIAL_DEFAULTS },
    defaultPlanTier: DEFAULT_PLAN_TIER,
    budgetGuard: {
      globalDailyBudgetUsd: GLOBAL_DAILY_BUDGET_USD,
      globalMonthlyBudgetUsd: GLOBAL_MONTHLY_BUDGET_USD,
    },
    pricingExperiment: {
      market: 'Vietnam beta',
      rewardedAdCredits: REWARDED_AD_CREDITS,
      freeMonthlyCredits: DEFAULT_FREE_MONTHLY_CREDITS,
      initialTrialCredits: DEFAULT_INITIAL_TRIAL_CREDITS,
      featureTrialCredits: { ...FEATURE_TRIAL_DEFAULTS },
      creditPacks: [
        { credits: 5, priceVnd: 19000, label: 'Starter' },
        { credits: 20, priceVnd: 59000, label: 'Family' },
      ],
      subscriptionTrial: {
        monthlyCredits: 60,
        priceVnd: 99000,
        label: 'Premium beta',
      },
      metrics: ['credit_consumption_per_active_user', 'ad_reward_claim_rate', 'top_up_conversion_rate', 'gross_margin'],
    },
    rewardedAd: {
      creditsPerAd: REWARDED_AD_CREDITS,
      unlimited: REWARDED_AD_DAILY_CAP <= 0,
    },
    iap: {
      products: listIapCatalog(),
    },
    features: Object.fromEntries(
      Object.keys(FEATURE_DEFAULTS).map((feature) => [feature, estimateAiUsage(feature)]),
    ),
    pricing: PAID_MODEL_PRICING,
  };
}

export async function getAiOpsSummary() {
  const todayRows = await listUsageRowsSince(startOfDayIso());
  const monthRows = await listUsageRowsSince(startOfMonthIso());
  const byFeature = {};
  for (const row of monthRows) {
    const key = row.feature || 'unknown';
    byFeature[key] = byFeature[key] ?? { calls: 0, estimatedCostUsd: 0 };
    if (row.status === 'ok' && !row.cached) {
      byFeature[key].calls += 1;
      byFeature[key].estimatedCostUsd = Number((byFeature[key].estimatedCostUsd + Number(row.estimated_cost_usd ?? 0)).toFixed(6));
    }
  }
  return {
    today: {
      estimatedSpendUsd: Number(sumUsageRows(todayRows).toFixed(6)),
      budgetUsd: GLOBAL_DAILY_BUDGET_USD,
      remainingBudgetUsd: Number(Math.max(0, GLOBAL_DAILY_BUDGET_USD - sumUsageRows(todayRows)).toFixed(6)),
    },
    month: {
      estimatedSpendUsd: Number(sumUsageRows(monthRows).toFixed(6)),
      budgetUsd: GLOBAL_MONTHLY_BUDGET_USD,
      remainingBudgetUsd: Number(Math.max(0, GLOBAL_MONTHLY_BUDGET_USD - sumUsageRows(monthRows)).toFixed(6)),
    },
    byFeature,
    config: getAiEconomicsConfig(),
  };
}
