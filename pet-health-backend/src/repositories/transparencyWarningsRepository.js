import { randomUUID } from 'node:crypto';
import { createSupabaseWithUserAccessToken, getSupabaseServiceClient } from '../config/supabase.js';
import { adminUpdateAccountProfile } from './accountRepository.js';
import {
  computeTransparencyScoreFromProfile,
  isOpenTransparencyWarningStatus,
  normalizeTransparencyWarningStatus,
  shouldTriggerTransparencyWarning,
} from '../utils/transparencyWarnings.js';

const memoryWarnings = [];
const memoryProfilesRef = { getter: () => [], setter: null };

/** Wire memory profiles from petFeedRepository for tests / no-supabase mode. */
export function bindTransparencyWarningMemoryProfiles(getter, setter) {
  memoryProfilesRef.getter = getter;
  memoryProfilesRef.setter = setter;
}

function getSupabase(accessToken) {
  return getSupabaseServiceClient() ?? createSupabaseWithUserAccessToken(accessToken);
}

function trimText(value, max = 500) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function httpError(message, status, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toWarning(row) {
  if (!row) return row;
  return {
    id: row.id,
    breeder_profile_id: row.breeder_profile_id,
    user_id: row.user_id,
    score_at_trigger: row.score_at_trigger ?? 0,
    penalty_points_at_trigger: row.penalty_points_at_trigger ?? 0,
    trigger_violation_id: row.trigger_violation_id ?? '',
    status: row.status ?? 'pending_breeder_action',
    breeder_action_at: row.breeder_action_at ?? null,
    admin_resolution: row.admin_resolution ?? '',
    admin_note: row.admin_note ?? '',
    admin_resolved_at: row.admin_resolved_at ?? null,
    admin_resolved_by: row.admin_resolved_by ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    breeder_profile: row.breeder_profile || null,
  };
}

async function loadProfileById(profileId) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return memoryProfilesRef.getter().find((p) => p.id === profileId) ?? null;
  }
  const { data, error } = await supabase
    .from('breeder_profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function updateProfileRow(profileId, patch) {
  const now = new Date().toISOString();
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const profiles = memoryProfilesRef.getter();
    const idx = profiles.findIndex((p) => p.id === profileId);
    if (idx < 0) return null;
    const next = { ...profiles[idx], ...patch, updated_at: now };
    if (typeof memoryProfilesRef.setter === 'function') {
      memoryProfilesRef.setter(idx, next);
    } else {
      profiles[idx] = next;
    }
    return next;
  }
  const { data, error } = await supabase
    .from('breeder_profiles')
    .update({ ...patch, updated_at: now })
    .eq('id', profileId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function findOpenTransparencyWarning(breederProfileId, accessToken) {
  const safeId = trimText(breederProfileId, 64);
  if (!safeId) return null;
  const supabase = getSupabase(accessToken);
  if (!supabase) {
    return toWarning(
      memoryWarnings.find(
        (row) =>
          row.breeder_profile_id === safeId
          && isOpenTransparencyWarningStatus(row.status),
      ) ?? null,
    );
  }
  const { data, error } = await supabase
    .from('transparency_warnings')
    .select('*')
    .eq('breeder_profile_id', safeId)
    .in('status', ['pending_breeder_action', 'appealed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return toWarning(data);
}

export async function getMyOpenTransparencyWarning(userId, accessToken) {
  const supabase = getSupabase(accessToken);
  if (!supabase) {
    return toWarning(
      memoryWarnings.find(
        (row) =>
          row.user_id === userId
          && isOpenTransparencyWarningStatus(row.status),
      ) ?? null,
    );
  }
  const { data, error } = await supabase
    .from('transparency_warnings')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending_breeder_action', 'appealed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return toWarning(data);
}

/**
 * After a penalty is applied, create a warning if score dropped to ≤15.
 * Returns the warning row or null.
 */
export async function maybeCreateTransparencyWarningAfterPenalty({
  profileBefore,
  profileAfter,
  triggerViolationId = '',
  accessToken,
}) {
  const before = computeTransparencyScoreFromProfile(profileBefore);
  const after = computeTransparencyScoreFromProfile(profileAfter);
  if (!shouldTriggerTransparencyWarning({
    scoreBefore: before.score,
    scoreAfter: after.score,
    isVerified: after.isVerified,
  })) {
    return null;
  }

  const existing = await findOpenTransparencyWarning(profileAfter.id, accessToken);
  if (existing) return null;

  const now = new Date().toISOString();
  const row = {
    id: randomUUID(),
    breeder_profile_id: profileAfter.id,
    user_id: profileAfter.user_id,
    score_at_trigger: after.score,
    penalty_points_at_trigger: after.penaltyPoints,
    trigger_violation_id: trimText(triggerViolationId, 80),
    status: 'pending_breeder_action',
    breeder_action_at: null,
    admin_resolution: '',
    admin_note: '',
    admin_resolved_at: null,
    admin_resolved_by: null,
    created_at: now,
    updated_at: now,
  };

  const supabase = getSupabaseServiceClient() ?? getSupabase(accessToken);
  if (!supabase) {
    memoryWarnings.push(row);
    return toWarning(row);
  }

  const { data, error } = await supabase
    .from('transparency_warnings')
    .insert({
      breeder_profile_id: row.breeder_profile_id,
      user_id: row.user_id,
      score_at_trigger: row.score_at_trigger,
      penalty_points_at_trigger: row.penalty_points_at_trigger,
      trigger_violation_id: row.trigger_violation_id,
      status: row.status,
    })
    .select('*')
    .single();
  if (error) {
    // Unique open-warning index race → treat as already open.
    if (String(error.code) === '23505') return null;
    throw error;
  }
  return toWarning(data);
}

export async function confirmTransparencyWarning(userId, warningId, accessToken) {
  const warning = await getWarningForUser(userId, warningId, accessToken);
  if (warning.status !== 'pending_breeder_action') {
    throw httpError('Warning is not awaiting breeder action.', 400, 'WARNING_NOT_PENDING');
  }
  const now = new Date().toISOString();
  const updated = await updateWarning(warning.id, {
    status: 'confirmed',
    breeder_action_at: now,
    updated_at: now,
  }, accessToken);

  await adminUpdateAccountProfile(userId, { accountStatus: 'suspended' });
  await updateProfileRow(warning.breeder_profile_id, {
    verification_status: 'suspended',
  });

  return updated;
}

export async function appealTransparencyWarning(userId, warningId, accessToken) {
  const warning = await getWarningForUser(userId, warningId, accessToken);
  if (warning.status !== 'pending_breeder_action') {
    throw httpError('Warning is not awaiting breeder action.', 400, 'WARNING_NOT_PENDING');
  }
  const now = new Date().toISOString();
  return updateWarning(warning.id, {
    status: 'appealed',
    breeder_action_at: now,
    updated_at: now,
  }, accessToken);
}

export async function listAdminTransparencyAppeals(status = 'appealed') {
  const safeStatus = normalizeTransparencyWarningStatus(status) || 'appealed';
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return memoryWarnings
      .filter((row) => !safeStatus || row.status === safeStatus)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .map((row) => {
        const profile = memoryProfilesRef.getter().find((p) => p.id === row.breeder_profile_id) ?? null;
        return toWarning({ ...row, breeder_profile: profile });
      });
  }
  let query = supabase
    .from('transparency_warnings')
    .select('*, breeder_profile:breeder_profiles(*)')
    .order('created_at', { ascending: false });
  if (safeStatus) query = query.eq('status', safeStatus);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toWarning);
}

export async function getAdminTransparencyWarningById(warningId) {
  const safeId = trimText(warningId, 64);
  if (!safeId) return null;
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const row = memoryWarnings.find((item) => item.id === safeId) ?? null;
    if (!row) return null;
    const profile = memoryProfilesRef.getter().find((p) => p.id === row.breeder_profile_id) ?? null;
    return toWarning({ ...row, breeder_profile: profile });
  }
  const { data, error } = await supabase
    .from('transparency_warnings')
    .select('*, breeder_profile:breeder_profiles(*)')
    .eq('id', safeId)
    .maybeSingle();
  if (error) throw error;
  return toWarning(data);
}

/**
 * Admin resolves an appealed warning.
 * resolution: 'uphold' | 'restore'
 */
export async function adminResolveTransparencyWarning(warningId, resolution, options = {}) {
  const safeResolution = String(resolution || '').trim().toLowerCase();
  if (safeResolution !== 'uphold' && safeResolution !== 'restore') {
    throw httpError('resolution must be uphold or restore.', 400, 'INVALID_RESOLUTION');
  }
  const adminNote = trimText(options.adminNote ?? options.admin_note, 500);
  const adminUserId = trimText(options.adminUserId ?? options.admin_user_id, 64) || 'admin';

  const existing = await getAdminTransparencyWarningById(warningId);
  if (!existing) return null;
  if (existing.status !== 'appealed' && existing.status !== 'pending_breeder_action') {
    throw httpError('Warning is not open for admin resolution.', 400, 'WARNING_NOT_OPEN');
  }

  const now = new Date().toISOString();

  if (safeResolution === 'uphold') {
    const updated = await updateWarning(existing.id, {
      status: 'upheld',
      admin_resolution: 'uphold',
      admin_note: adminNote,
      admin_resolved_at: now,
      admin_resolved_by: adminUserId,
      updated_at: now,
    }, null);
    await adminUpdateAccountProfile(existing.user_id, { accountStatus: 'suspended' });
    await updateProfileRow(existing.breeder_profile_id, {
      verification_status: 'suspended',
    });
    return updated;
  }

  // restore: waive triggering / latest active violation, keep account active
  const profile = await loadProfileById(existing.breeder_profile_id);
  if (profile) {
    const meta = asObject(profile.metadata);
    const violations = Array.isArray(meta.violations) ? [...meta.violations] : [];
    let waived = false;
    if (existing.trigger_violation_id) {
      for (const v of violations) {
        if (v && v.id === existing.trigger_violation_id && v.status !== 'waived') {
          v.status = 'waived';
          waived = true;
          break;
        }
      }
    }
    if (!waived) {
      for (let i = violations.length - 1; i >= 0; i -= 1) {
        const v = violations[i];
        if (v && v.status !== 'waived') {
          v.status = 'waived';
          waived = true;
          break;
        }
      }
    }
    const penaltyPoints = violations
      .filter((item) => item && item.status === 'active')
      .reduce((sum, item) => sum + (Number.isFinite(Number(item.points)) ? Math.max(0, Math.floor(Number(item.points))) : 0), 0);
    meta.violations = violations;
    meta.penaltyPoints = penaltyPoints;
    await updateProfileRow(existing.breeder_profile_id, {
      metadata: meta,
      verification_status: profile.verification_status === 'suspended' ? 'verified' : profile.verification_status,
    });
  }

  await adminUpdateAccountProfile(existing.user_id, { accountStatus: 'active' });
  return updateWarning(existing.id, {
    status: 'restored',
    admin_resolution: 'restore',
    admin_note: adminNote,
    admin_resolved_at: now,
    admin_resolved_by: adminUserId,
    updated_at: now,
  }, null);
}

async function getWarningForUser(userId, warningId, accessToken) {
  const safeId = trimText(warningId, 64);
  if (!safeId) throw httpError('warningId is required.', 400, 'MISSING_WARNING_ID');
  const supabase = getSupabase(accessToken);
  let row = null;
  if (!supabase) {
    row = memoryWarnings.find((item) => item.id === safeId && item.user_id === userId) ?? null;
  } else {
    const { data, error } = await supabase
      .from('transparency_warnings')
      .select('*')
      .eq('id', safeId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    row = data;
  }
  if (!row) throw httpError('Warning not found.', 404, 'WARNING_NOT_FOUND');
  return toWarning(row);
}

async function updateWarning(warningId, patch, accessToken) {
  const supabase = getSupabaseServiceClient() ?? getSupabase(accessToken);
  if (!supabase) {
    const idx = memoryWarnings.findIndex((row) => row.id === warningId);
    if (idx < 0) return null;
    memoryWarnings[idx] = { ...memoryWarnings[idx], ...patch };
    return toWarning(memoryWarnings[idx]);
  }
  const { data, error } = await supabase
    .from('transparency_warnings')
    .update(patch)
    .eq('id', warningId)
    .select('*')
    .single();
  if (error) throw error;
  return toWarning(data);
}

export function resetTransparencyWarningMemoryForTests() {
  memoryWarnings.length = 0;
}

export function seedTransparencyWarningMemoryForTests(warning) {
  memoryWarnings.push(warning);
}
