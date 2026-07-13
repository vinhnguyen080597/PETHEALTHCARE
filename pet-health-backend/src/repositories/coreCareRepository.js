import { randomUUID } from 'node:crypto';
import { createSupabaseWithUserAccessToken, getSupabaseServiceClient } from '../config/supabase.js';

const ALLOWED_TYPES = new Set(['diary', 'vet_visit', 'document', 'reminder', 'vaccine', 'weight']);
const memoryRecords = [];

function getCoreCareSupabase(accessToken) {
  const withJwt = createSupabaseWithUserAccessToken(accessToken);
  if (withJwt) return withJwt;
  return getSupabaseServiceClient();
}

function normalizeType(value) {
  const type = String(value ?? '').trim().toLowerCase();
  return ALLOWED_TYPES.has(type) ? type : null;
}

function normalizeStatus(type, value) {
  const status = String(value ?? '').trim().toLowerCase();
  if (type === 'reminder') {
    return ['pending', 'done', 'skipped'].includes(status) ? status : 'pending';
  }
  return ['active', 'archived'].includes(status) ? status : 'active';
}

function trimText(value, max = 2000) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeDate(value) {
  const text = trimText(value, 64);
  if (!text) return null;
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizePayload(userId, petId, payload) {
  const type = normalizeType(payload.type);
  if (!type) {
    const err = new Error('type must be diary, vet_visit, document, reminder, vaccine, or weight');
    err.status = 400;
    err.code = 'INVALID_CORE_CARE_TYPE';
    throw err;
  }
  const title = trimText(payload.title, 160);
  if (!title) {
    const err = new Error('title is required');
    err.status = 400;
    err.code = 'CORE_CARE_TITLE_REQUIRED';
    throw err;
  }
  const metadata = payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
    ? payload.metadata
    : {};
  return {
    id: payload.id ?? randomUUID(),
    user_id: userId,
    pet_id: petId,
    type,
    title,
    note: trimText(payload.note, 4000),
    occurred_at: normalizeDate(payload.occurredAt ?? payload.occurred_at) ?? new Date().toISOString(),
    due_at: normalizeDate(payload.dueAt ?? payload.due_at),
    status: normalizeStatus(type, payload.status),
    metadata,
    created_at: payload.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function toApiRecord(row) {
  if (!row) return row;
  return {
    id: row.id,
    user_id: row.user_id,
    pet_id: row.pet_id,
    type: row.type,
    title: row.title,
    note: row.note,
    occurred_at: row.occurred_at,
    due_at: row.due_at,
    status: row.status,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listCoreCareRecords(userId, petId, accessToken, options = {}) {
  const type = normalizeType(options.type);
  const supabase = getCoreCareSupabase(accessToken);
  if (!supabase) {
    return memoryRecords
      .filter((row) => row.user_id === userId && row.pet_id === petId && (!type || row.type === type))
      .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1))
      .map(toApiRecord);
  }
  let query = supabase
    .from('pet_care_records')
    .select('*')
    .eq('user_id', userId)
    .eq('pet_id', petId)
    .order('occurred_at', { ascending: false });
  if (type) query = query.eq('type', type);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toApiRecord);
}

export async function createCoreCareRecord(userId, petId, payload, accessToken) {
  const row = normalizePayload(userId, petId, payload);
  const supabase = getCoreCareSupabase(accessToken);
  if (!supabase) {
    memoryRecords.push(row);
    return toApiRecord(row);
  }
  const { data, error } = await supabase.from('pet_care_records').insert(row).select('*').single();
  if (error) throw error;
  return toApiRecord(data);
}

export async function updateCoreCareRecord(userId, recordId, payload, accessToken) {
  const updates = {
    ...(payload.title !== undefined ? { title: trimText(payload.title, 160) } : {}),
    ...(payload.note !== undefined ? { note: trimText(payload.note, 4000) } : {}),
    ...(payload.occurredAt !== undefined || payload.occurred_at !== undefined
      ? { occurred_at: normalizeDate(payload.occurredAt ?? payload.occurred_at) }
      : {}),
    ...(payload.dueAt !== undefined || payload.due_at !== undefined
      ? { due_at: normalizeDate(payload.dueAt ?? payload.due_at) }
      : {}),
    ...(payload.status !== undefined ? { status: trimText(payload.status, 32).toLowerCase() } : {}),
    ...(payload.metadata !== undefined && payload.metadata && typeof payload.metadata === 'object'
      ? { metadata: payload.metadata }
      : {}),
    updated_at: new Date().toISOString(),
  };

  const supabase = getCoreCareSupabase(accessToken);
  if (!supabase) {
    const idx = memoryRecords.findIndex((row) => row.user_id === userId && row.id === recordId);
    if (idx < 0) return null;
    memoryRecords[idx] = { ...memoryRecords[idx], ...updates };
    return toApiRecord(memoryRecords[idx]);
  }
  const { data, error } = await supabase
    .from('pet_care_records')
    .update(updates)
    .eq('user_id', userId)
    .eq('id', recordId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return toApiRecord(data);
}

export async function deleteCoreCareRecord(userId, recordId, accessToken) {
  const supabase = getCoreCareSupabase(accessToken);
  if (!supabase) {
    const idx = memoryRecords.findIndex((row) => row.user_id === userId && row.id === recordId);
    if (idx < 0) return false;
    memoryRecords.splice(idx, 1);
    return true;
  }
  const { data, error } = await supabase
    .from('pet_care_records')
    .delete()
    .eq('user_id', userId)
    .eq('id', recordId)
    .select('id');
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

export function summarizeCoreCareRecords(records) {
  const summary = {
    diary: 0,
    vet_visit: 0,
    document: 0,
    reminder: 0,
    vaccine: 0,
    weight: 0,
    pendingReminders: 0,
    overdueReminders: 0,
  };
  const now = Date.now();
  for (const record of records) {
    if (record.type in summary) summary[record.type] += 1;
    if (record.type === 'reminder' && record.status === 'pending') {
      summary.pendingReminders += 1;
      if (record.due_at && new Date(record.due_at).getTime() < now) summary.overdueReminders += 1;
    }
  }
  return summary;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isVaccinationScheduleDueRecord(record, today = new Date()) {
  if (!record?.due_at || record.status === 'done' || record.type === 'vaccine') return false;
  const trimmed = String(record.due_at).trim();
  if (!trimmed) return false;
  const parsed = new Date(trimmed.includes('T') ? trimmed : `${trimmed}T00:00:00`);
  if (!Number.isFinite(parsed.getTime())) return false;
  return startOfDay(parsed).getTime() <= startOfDay(today).getTime();
}

/** Counts due schedule badges per pet (matches frontend vaccinationDueNotifications). */
export async function listVaccinationDueCountsByUser(userId, accessToken) {
  const supabase = getCoreCareSupabase(accessToken);
  const today = new Date();

  if (!supabase) {
    const counts = {};
    for (const row of memoryRecords) {
      if (row.user_id !== userId || !isVaccinationScheduleDueRecord(row, today)) continue;
      counts[row.pet_id] = (counts[row.pet_id] ?? 0) + 1;
    }
    return counts;
  }

  const { data, error } = await supabase
    .from('pet_care_records')
    .select('pet_id, type, status, due_at')
    .eq('user_id', userId)
    .not('due_at', 'is', null)
    .neq('status', 'done')
    .neq('type', 'vaccine');

  if (error) throw error;

  const counts = {};
  for (const row of data ?? []) {
    if (!isVaccinationScheduleDueRecord(row, today)) continue;
    counts[row.pet_id] = (counts[row.pet_id] ?? 0) + 1;
  }
  return counts;
}
