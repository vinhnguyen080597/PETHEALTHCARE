import { randomUUID } from 'node:crypto';
import { getSupabaseServiceClient } from '../config/supabase.js';

const memoryLogs = [];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function trimText(value, max = 500) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function asObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...value };
}

async function actorDisplayNames(userIds) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return new Map();
  const supabase = getSupabaseServiceClient();
  if (!supabase) return new Map(unique.map((id) => [id, 'Admin']));
  const { data, error } = await supabase
    .from('app_user_profiles')
    .select('user_id, display_name')
    .in('user_id', unique);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.user_id, trimText(row.display_name, 160) || 'Admin']));
}

function toLog(row, extras = {}) {
  if (!row) return row;
  return {
    id: row.id,
    created_at: row.created_at,
    actor_user_id: row.actor_user_id ?? null,
    actor_via_secret: Boolean(row.actor_via_secret),
    actor_display_name: extras.actor_display_name ?? null,
    action: row.action,
    target_type: row.target_type,
    target_id: row.target_id ?? null,
    target_user_id: row.target_user_id ?? null,
    before_state: asObject(row.before_state),
    after_state: asObject(row.after_state),
    metadata: asObject(row.metadata),
  };
}

/**
 * Persist one admin audit row. Safe to fire-and-forget from routes.
 */
export async function recordAdminAction({
  actorUserId = null,
  viaSecret = false,
  action,
  targetType,
  targetId = null,
  targetUserId = null,
  beforeState = {},
  afterState = {},
  metadata = {},
}) {
  const safeAction = trimText(action, 80);
  const safeTargetType = trimText(targetType, 64);
  if (!safeAction || !safeTargetType) return null;

  const row = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    actor_user_id: trimText(actorUserId, 64) || null,
    actor_via_secret: Boolean(viaSecret),
    action: safeAction,
    target_type: safeTargetType,
    target_id: trimText(targetId, 64) || null,
    target_user_id: trimText(targetUserId, 64) || null,
    before_state: asObject(beforeState),
    after_state: asObject(afterState),
    metadata: asObject(metadata),
  };

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    memoryLogs.unshift(row);
    if (memoryLogs.length > 500) memoryLogs.length = 500;
    return toLog(row);
  }

  const { data, error } = await supabase.from('admin_action_logs').insert(row).select('*').single();
  if (error) throw error;
  return toLog(data);
}

/**
 * List admin action logs with optional filters + keyset cursor.
 * Cursor format: `${created_at}|${id}`
 */
export async function listAdminActionLogs(options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const action = trimText(options.action, 80);
  const actorUserId = trimText(options.actorUserId ?? options.actor_user_id, 64);
  const targetType = trimText(options.targetType ?? options.target_type, 64);
  const targetId = trimText(options.targetId ?? options.target_id, 64);
  const targetUserId = trimText(options.targetUserId ?? options.target_user_id, 64);
  const from = trimText(options.from, 40);
  const to = trimText(options.to, 40);
  const cursor = trimText(options.cursor, 120);

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    let rows = [...memoryLogs];
    if (action) rows = rows.filter((row) => row.action === action);
    if (actorUserId) rows = rows.filter((row) => row.actor_user_id === actorUserId);
    if (targetType) rows = rows.filter((row) => row.target_type === targetType);
    if (targetId) rows = rows.filter((row) => row.target_id === targetId);
    if (targetUserId) rows = rows.filter((row) => row.target_user_id === targetUserId);
    if (from) rows = rows.filter((row) => String(row.created_at) >= from);
    if (to) rows = rows.filter((row) => String(row.created_at) <= to);
    if (cursor) {
      const [cursorAt, cursorId] = cursor.split('|');
      rows = rows.filter((row) => {
        if (String(row.created_at) < cursorAt) return true;
        if (String(row.created_at) > cursorAt) return false;
        return String(row.id) < String(cursorId);
      });
    }
    rows = rows
      .sort((a, b) => {
        const byTime = String(b.created_at).localeCompare(String(a.created_at));
        if (byTime !== 0) return byTime;
        return String(b.id).localeCompare(String(a.id));
      })
      .slice(0, limit + 1);
    const page = rows.slice(0, limit);
    const names = await actorDisplayNames(page.map((row) => row.actor_user_id));
    const data = page.map((row) =>
      toLog(row, { actor_display_name: row.actor_user_id ? names.get(row.actor_user_id) || 'Admin' : null }),
    );
    const next = rows.length > limit ? `${page[page.length - 1].created_at}|${page[page.length - 1].id}` : null;
    return { data, next_cursor: next };
  }

  let query = supabase.from('admin_action_logs').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit + 1);
  if (action) query = query.eq('action', action);
  if (actorUserId) query = query.eq('actor_user_id', actorUserId);
  if (targetType) query = query.eq('target_type', targetType);
  if (targetId) query = query.eq('target_id', targetId);
  if (targetUserId) query = query.eq('target_user_id', targetUserId);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);
  if (cursor) {
    const [cursorAt, cursorId] = cursor.split('|');
    if (cursorAt && cursorId) {
      query = query.or(
        `created_at.lt.${cursorAt},and(created_at.eq.${cursorAt},id.lt.${cursorId})`,
      );
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  const page = rows.slice(0, limit);
  const names = await actorDisplayNames(page.map((row) => row.actor_user_id));
  const mapped = page.map((row) =>
    toLog(row, {
      actor_display_name: row.actor_user_id ? names.get(row.actor_user_id) || 'Admin' : null,
    }),
  );
  const nextCursor =
    rows.length > limit && page.length
      ? `${page[page.length - 1].created_at}|${page[page.length - 1].id}`
      : null;
  return { data: mapped, next_cursor: nextCursor };
}

/** Test-only: clear in-memory audit rows when Supabase is not configured. */
export function __resetAdminActionLogsMemoryForTests() {
  memoryLogs.length = 0;
}
