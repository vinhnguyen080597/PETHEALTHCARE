import { randomUUID } from 'node:crypto';
import { getSupabaseServiceClient } from '../config/supabase.js';

const DEFAULT_FREE_MONTHLY_CREDITS = numberFromEnv('AI_FREE_MONTHLY_CREDITS', 5);
const DEFAULT_PLAN_TIER = process.env.AI_DEFAULT_PLAN_TIER || 'free';

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

function createDefaultAccount(userId) {
  const now = new Date();
  return {
    user_id: userId,
    plan_tier: DEFAULT_PLAN_TIER,
    credit_balance: DEFAULT_FREE_MONTHLY_CREDITS,
    monthly_allowance: DEFAULT_FREE_MONTHLY_CREDITS,
    monthly_reset_at: nextMonthlyResetDate(now).toISOString(),
    updated_at: now.toISOString(),
  };
}

function normalizeAccount(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    planTier: row.plan_tier || DEFAULT_PLAN_TIER,
    creditBalance: Number(row.credit_balance ?? 0),
    monthlyAllowance: Number(row.monthly_allowance ?? DEFAULT_FREE_MONTHLY_CREDITS),
    monthlyResetAt: row.monthly_reset_at,
    updatedAt: row.updated_at,
  };
}

function maybeResetAccount(row) {
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

async function getAccountRow(userId) {
  const supabase = supabaseDisabled ? null : getSupabaseServiceClient();
  if (!supabase) {
    const current = memoryAccounts.get(userId) ?? createDefaultAccount(userId);
    const next = maybeResetAccount(current);
    memoryAccounts.set(userId, next);
    return next;
  }

  try {
    const { data, error } = await supabase.from('ai_credit_accounts').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    let row = data ?? createDefaultAccount(userId);
    row = maybeResetAccount(row);
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
  const amount = estimate.creditCost;
  if (amount <= 0) {
    return { ok: true, skipped: true, reservationId: null, amount: 0, estimate, account: await getAiCreditSummary(userId) };
  }

  const row = await getAccountRow(userId);
  const balance = Number(row.credit_balance ?? 0);
  if (balance < amount) {
    return {
      ok: false,
      status: 402,
      code: 'AI_CREDITS_EXHAUSTED',
      error: 'You have used all free AI credits for this month.',
      creditBalance: balance,
      creditCost: amount,
      monthlyResetAt: row.monthly_reset_at,
      estimate,
    };
  }

  const reservationId = randomUUID();
  const next = {
    ...row,
    credit_balance: Number((balance - amount).toFixed(2)),
    updated_at: nowIso(),
  };
  await saveAccountRow(next);
  await insertLedger({
    id: reservationId,
    user_id: userId,
    delta: -amount,
    reason: 'ai_reserve',
    feature,
    pet_id: petId,
    metadata: { ...metadata, estimate },
    created_at: nowIso(),
  });
  return {
    ok: true,
    userId,
    feature,
    petId,
    reservationId,
    amount,
    estimate,
    account: normalizeAccount(next),
  };
}

export async function refundAiCredits(reservation, reason = 'ai_refund') {
  if (!reservation?.ok || !reservation.reservationId || !(reservation.amount > 0)) return null;
  const userId = reservation.userId;
  if (!userId) return null;

  const row = await getAccountRow(userId);
  const next = {
    ...row,
    credit_balance: Number((Number(row.credit_balance ?? 0) + reservation.amount).toFixed(2)),
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
    defaultPlanTier: DEFAULT_PLAN_TIER,
    pricingExperiment: {
      market: 'Vietnam beta',
      rewardedAdCredits: 1,
      freeMonthlyCredits: DEFAULT_FREE_MONTHLY_CREDITS,
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
    features: Object.fromEntries(
      Object.keys(FEATURE_DEFAULTS).map((feature) => [feature, estimateAiUsage(feature)]),
    ),
    pricing: PAID_MODEL_PRICING,
  };
}
