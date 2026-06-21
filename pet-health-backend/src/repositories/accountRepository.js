import { getSupabaseServiceClient } from '../config/supabase.js';

export const USER_ROLES = new Set(['sen', 'breeder', 'admin', 'vet']);
export const SIGNUP_ROLES = new Set(['sen', 'breeder']);
const ACCOUNT_STATUSES = new Set(['active', 'suspended']);
const memoryAccounts = [];

function trimText(value, max = 500) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

export function normalizeUserRole(value, fallback = 'sen') {
  const role = trimText(value, 32).toLowerCase();
  return USER_ROLES.has(role) ? role : fallback;
}

export function normalizeSignupRole(value) {
  const role = normalizeUserRole(value, 'sen');
  return SIGNUP_ROLES.has(role) ? role : 'sen';
}

function normalizeAccountStatus(value) {
  const status = trimText(value, 32).toLowerCase();
  return ACCOUNT_STATUSES.has(status) ? status : 'active';
}

function toAccount(row) {
  if (!row) return row;
  return {
    user_id: row.user_id,
    email: row.email ?? null,
    login_identifier: row.login_identifier ?? '',
    display_name: row.display_name ?? '',
    primary_role: normalizeUserRole(row.primary_role, 'sen'),
    account_status: normalizeAccountStatus(row.account_status),
    metadata: row.metadata ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function memoryUpsert(row) {
  const idx = memoryAccounts.findIndex((account) => account.user_id === row.user_id);
  const next = { ...(idx >= 0 ? memoryAccounts[idx] : { created_at: new Date().toISOString() }), ...row };
  if (idx >= 0) memoryAccounts[idx] = next;
  else memoryAccounts.push(next);
  return toAccount(next);
}

export async function getAccountProfile(userId) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return toAccount(memoryAccounts.find((account) => account.user_id === userId) ?? null);
  const { data, error } = await supabase.from('app_user_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return toAccount(data);
}

export async function ensureAccountProfile({
  userId,
  email,
  loginIdentifier,
  displayName,
  primaryRole = 'sen',
  metadata = {},
  allowPrivilegedRole = false,
}) {
  const existing = await getAccountProfile(userId);
  const now = new Date().toISOString();
  const createdByAdmin = allowPrivilegedRole || metadata?.created_by_admin === true;
  const initialRole = createdByAdmin ? normalizeUserRole(primaryRole, 'sen') : normalizeSignupRole(primaryRole);
  const row = {
    user_id: userId,
    email: trimText(email, 320) || null,
    login_identifier: trimText(loginIdentifier, 160),
    display_name: trimText(displayName, 160) || trimText(loginIdentifier, 160) || 'Pet Health user',
    primary_role: existing?.primary_role ?? initialRole,
    account_status: existing?.account_status ?? 'active',
    metadata: { ...(existing?.metadata ?? {}), ...(metadata && typeof metadata === 'object' ? metadata : {}) },
    updated_at: now,
  };
  const supabase = getSupabaseServiceClient();
  if (!supabase) return memoryUpsert(row);
  const { data, error } = await supabase.from('app_user_profiles').upsert(row, { onConflict: 'user_id' }).select('*').single();
  if (error) throw error;
  return toAccount(data);
}

export async function listAdminAccounts(search = '') {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const q = trimText(search, 120).toLowerCase();
    return memoryAccounts
      .filter((account) => !q || [account.email, account.login_identifier, account.display_name, account.primary_role].some((v) => String(v ?? '').toLowerCase().includes(q)))
      .map(toAccount);
  }
  let query = supabase.from('app_user_profiles').select('*').order('created_at', { ascending: false });
  const q = trimText(search, 120);
  if (q) {
    const safe = q.replace(/[%_,]/g, '');
    query = query.or(`email.ilike.%${safe}%,login_identifier.ilike.%${safe}%,display_name.ilike.%${safe}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toAccount);
}

export async function adminUpdateAccountProfile(userId, payload) {
  const existing = await getAccountProfile(userId);
  if (!existing) return null;
  const patch = {
    primary_role: normalizeUserRole(payload.primaryRole ?? payload.primary_role, existing.primary_role),
    account_status: normalizeAccountStatus(payload.accountStatus ?? payload.account_status ?? existing.account_status),
    display_name: trimText(payload.displayName ?? payload.display_name, 160) || existing.display_name,
    updated_at: new Date().toISOString(),
  };
  const supabase = getSupabaseServiceClient();
  if (!supabase) return memoryUpsert({ ...existing, ...patch });
  const { data, error } = await supabase.from('app_user_profiles').update(patch).eq('user_id', userId).select('*').maybeSingle();
  if (error) throw error;
  return toAccount(data);
}

export async function updateSelfAccountLogin(userId, { email, loginIdentifier }) {
  const existing = await getAccountProfile(userId);
  if (!existing) return null;
  const patch = {
    email: trimText(email, 320) || null,
    login_identifier: trimText(loginIdentifier, 160) || existing.login_identifier,
    updated_at: new Date().toISOString(),
  };
  const supabase = getSupabaseServiceClient();
  if (!supabase) return memoryUpsert({ ...existing, ...patch });
  const { data, error } = await supabase
    .from('app_user_profiles')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return toAccount(data);
}

export function getPendingEmailChangeTarget(account) {
  const target = trimText(account?.metadata?.pending_email_change_to, 320).toLocaleLowerCase('en-US');
  return target || null;
}

export async function setPendingEmailChange(userId, { newEmail, fromEmail }) {
  const existing = await getAccountProfile(userId);
  if (!existing) return null;
  const patch = {
    metadata: {
      ...(existing.metadata ?? {}),
      pending_email_change_to: trimText(newEmail, 320).toLocaleLowerCase('en-US'),
      pending_email_change_from: trimText(fromEmail, 320).toLocaleLowerCase('en-US'),
      pending_email_change_at: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };
  const supabase = getSupabaseServiceClient();
  if (!supabase) return memoryUpsert({ ...existing, ...patch });
  const { data, error } = await supabase
    .from('app_user_profiles')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return toAccount(data);
}

export async function clearPendingEmailChange(userId) {
  const existing = await getAccountProfile(userId);
  if (!existing) return null;
  const metadata = { ...(existing.metadata ?? {}) };
  delete metadata.pending_email_change_to;
  delete metadata.pending_email_change_from;
  delete metadata.pending_email_change_at;
  const patch = {
    metadata,
    updated_at: new Date().toISOString(),
  };
  const supabase = getSupabaseServiceClient();
  if (!supabase) return memoryUpsert({ ...existing, ...patch });
  const { data, error } = await supabase
    .from('app_user_profiles')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return toAccount(data);
}

export function getPendingPasswordRecoveryTarget(account) {
  const target = trimText(account?.metadata?.pending_password_recovery_email, 320).toLocaleLowerCase('en-US');
  return target || null;
}

export async function setPendingPasswordRecovery(userId, { email }) {
  const existing = await getAccountProfile(userId);
  if (!existing) return null;
  const patch = {
    metadata: {
      ...(existing.metadata ?? {}),
      pending_password_recovery_email: trimText(email, 320).toLocaleLowerCase('en-US'),
      pending_password_recovery_at: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };
  const supabase = getSupabaseServiceClient();
  if (!supabase) return memoryUpsert({ ...existing, ...patch });
  const { data, error } = await supabase
    .from('app_user_profiles')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return toAccount(data);
}

export async function clearPendingPasswordRecovery(userId) {
  const existing = await getAccountProfile(userId);
  if (!existing) return null;
  const metadata = { ...(existing.metadata ?? {}) };
  delete metadata.pending_password_recovery_email;
  delete metadata.pending_password_recovery_at;
  const patch = {
    metadata,
    updated_at: new Date().toISOString(),
  };
  const supabase = getSupabaseServiceClient();
  if (!supabase) return memoryUpsert({ ...existing, ...patch });
  const { data, error } = await supabase
    .from('app_user_profiles')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return toAccount(data);
}

export async function deleteAccountData(userId) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const idx = memoryAccounts.findIndex((account) => account.user_id === userId);
    if (idx >= 0) memoryAccounts.splice(idx, 1);
    return;
  }

  const deleteFrom = async (table, column = 'user_id') => {
    const { error } = await supabase.from(table).delete().eq(column, userId);
    if (error) throw error;
  };

  await deleteFrom('pet_feed_blocked_breeders');
  await deleteFrom('pet_feed_reports');
  await deleteFrom('pet_feed_favorites');
  await deleteFrom('pet_feed_posts');
  await deleteFrom('breeder_profiles');
  await deleteFrom('pet_care_records');
  await deleteFrom('analyses');
  await deleteFrom('pets');
  await deleteFrom('ai_usage_events');
  await deleteFrom('ai_credit_ledger');
  await deleteFrom('ai_credit_accounts');
  await deleteFrom('app_events');
  await deleteFrom('app_user_profiles');
}
