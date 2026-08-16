import { randomUUID } from 'node:crypto';
import { getSupabaseServiceClient } from '../config/supabase.js';

const memoryTickets = [];

const FEEDBACK_CATEGORIES = new Set(['ui', 'feature', 'bug', 'other']);
const SCAM_TARGET_TYPES = new Set(['account', 'phone', 'facebook', 'bank']);
const TICKET_STATUSES = new Set(['open', 'reviewed', 'dismissed']);
const TICKET_KINDS = new Set(['feedback', 'scam']);

export const SUPPORT_SCAM_MAX_EVIDENCE = 5;
export const SUPPORT_SCAM_MIN_EVIDENCE = 1;
export const SUPPORT_FEEDBACK_MAX_EVIDENCE = 3;

/** Demo samples kept in sync with web Support Hub (UI + API). */
export const BLACKLIST_DEMO_SAMPLES = [
  {
    id: 'sample-phone',
    tokens: ['0900000000', '84900000000'],
    labelKey: 'supportHub.blacklist.samplePhone',
    noteKey: 'supportHub.blacklist.sampleNote',
  },
  {
    id: 'sample-bank',
    tokens: ['0123456789', 'vietcombank0123456789'],
    labelKey: 'supportHub.blacklist.sampleBank',
    noteKey: 'supportHub.blacklist.sampleNote',
  },
];

function trimText(value, max = 2000) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

export function normalizeLookupQuery(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.]/g, '')
    .replace(/^\+84/, '0');
}

export function buildLookupTokens(...parts) {
  const tokens = new Set();
  for (const part of parts) {
    const q = normalizeLookupQuery(part);
    if (q.length >= 6) tokens.add(q);
  }
  return [...tokens];
}

function normalizeEvidenceUrls(raw, max) {
  if (!Array.isArray(raw)) return [];
  const urls = [];
  for (const item of raw) {
    const url = trimText(item, 800);
    if (!/^https?:\/\//i.test(url)) continue;
    if (urls.includes(url)) continue;
    urls.push(url);
    if (urls.length >= max) break;
  }
  return urls;
}

function toTicket(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    kind: row.kind,
    category: row.category || null,
    title: row.title || null,
    body: row.body || '',
    scam_target_type: row.scam_target_type || null,
    identifier: row.identifier || null,
    related_url: row.related_url || null,
    anonymous: Boolean(row.anonymous),
    evidence_confirmed: Boolean(row.evidence_confirmed),
    evidence_urls: Array.isArray(row.evidence_urls) ? row.evidence_urls.filter(Boolean) : [],
    lookup_tokens: Array.isArray(row.lookup_tokens) ? row.lookup_tokens.filter(Boolean) : [],
    status: row.status || 'open',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function validateFeedbackPayload(payload) {
  const category = trimText(payload.category, 40).toLowerCase();
  const title = trimText(payload.title, 160);
  const body = trimText(payload.body, 4000);
  const evidenceUrls = normalizeEvidenceUrls(
    payload.evidence_urls ?? payload.evidenceUrls,
    SUPPORT_FEEDBACK_MAX_EVIDENCE,
  );
  if (!FEEDBACK_CATEGORIES.has(category)) {
    const err = new Error('Invalid feedback category');
    err.status = 400;
    err.code = 'INVALID_FEEDBACK_CATEGORY';
    throw err;
  }
  if (!title || !body) {
    const err = new Error('Title and details are required');
    err.status = 400;
    err.code = 'MISSING_FEEDBACK_FIELDS';
    throw err;
  }
  return { category, title, body, evidence_urls: evidenceUrls, lookup_tokens: [] };
}

function validateScamPayload(payload) {
  const scamTargetType = trimText(payload.scam_target_type ?? payload.target_type, 40).toLowerCase();
  const identifier = trimText(payload.identifier, 240);
  const relatedUrl = trimText(payload.related_url ?? payload.listingOrProfileUrl, 500);
  const body = trimText(payload.body ?? payload.details, 4000);
  const anonymous = Boolean(payload.anonymous);
  const evidenceConfirmed = Boolean(payload.evidence_confirmed ?? payload.evidenceConfirmed);
  const evidenceUrls = normalizeEvidenceUrls(
    payload.evidence_urls ?? payload.evidenceUrls,
    SUPPORT_SCAM_MAX_EVIDENCE,
  );
  if (!SCAM_TARGET_TYPES.has(scamTargetType)) {
    const err = new Error('Invalid scam target type');
    err.status = 400;
    err.code = 'INVALID_SCAM_TARGET_TYPE';
    throw err;
  }
  if (!identifier || !body || !evidenceConfirmed) {
    const err = new Error('Identifier, details, and evidence confirmation are required');
    err.status = 400;
    err.code = 'MISSING_SCAM_FIELDS';
    throw err;
  }
  if (evidenceUrls.length < SUPPORT_SCAM_MIN_EVIDENCE) {
    const err = new Error('At least one evidence photo is required');
    err.status = 400;
    err.code = 'MISSING_SCAM_EVIDENCE';
    throw err;
  }
  return {
    scam_target_type: scamTargetType,
    identifier,
    related_url: relatedUrl || null,
    body,
    anonymous,
    evidence_confirmed: true,
    evidence_urls: evidenceUrls,
    lookup_tokens: buildLookupTokens(identifier, relatedUrl),
  };
}

export async function createSupportTicket(userId, payload, _accessToken) {
  const kind = trimText(payload.kind ?? payload.type, 20).toLowerCase();
  if (!TICKET_KINDS.has(kind)) {
    const err = new Error('kind must be feedback or scam');
    err.status = 400;
    err.code = 'INVALID_SUPPORT_KIND';
    throw err;
  }

  const now = new Date().toISOString();
  const base = {
    id: randomUUID(),
    user_id: userId,
    kind,
    category: null,
    title: null,
    body: '',
    scam_target_type: null,
    identifier: null,
    related_url: null,
    anonymous: false,
    evidence_confirmed: false,
    evidence_urls: [],
    lookup_tokens: [],
    status: 'open',
    created_at: now,
    updated_at: now,
  };

  const row =
    kind === 'feedback'
      ? { ...base, ...validateFeedbackPayload(payload) }
      : { ...base, ...validateScamPayload(payload), title: null, category: null };

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    memoryTickets.unshift(row);
    return toTicket(row);
  }

  const { data, error } = await supabase.from('support_tickets').insert(row).select('*').single();
  if (error) throw error;
  return toTicket(data);
}

export async function listAdminSupportTickets({ status = '', kind = '' } = {}) {
  const safeStatus = trimText(status, 40);
  const safeKind = trimText(kind, 20).toLowerCase();
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return memoryTickets
      .filter((row) => !safeStatus || row.status === safeStatus)
      .filter((row) => !safeKind || row.kind === safeKind)
      .map(toTicket);
  }

  let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
  if (safeStatus) query = query.eq('status', safeStatus);
  if (safeKind && TICKET_KINDS.has(safeKind)) query = query.eq('kind', safeKind);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toTicket);
}

export async function getAdminSupportTicketById(ticketId) {
  const id = trimText(ticketId, 64);
  if (!id) return null;
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return toTicket(memoryTickets.find((row) => row.id === id) || null);
  }
  const { data, error } = await supabase.from('support_tickets').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return toTicket(data);
}

export async function adminUpdateSupportTicketStatus(ticketId, status) {
  const id = trimText(ticketId, 64);
  const safeStatus = trimText(status, 40).toLowerCase();
  if (!id) return null;
  if (!TICKET_STATUSES.has(safeStatus)) {
    const err = new Error('Invalid ticket status');
    err.status = 400;
    err.code = 'INVALID_TICKET_STATUS';
    throw err;
  }
  const now = new Date().toISOString();
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const idx = memoryTickets.findIndex((row) => row.id === id);
    if (idx < 0) return null;
    memoryTickets[idx] = { ...memoryTickets[idx], status: safeStatus, updated_at: now };
    return toTicket(memoryTickets[idx]);
  }
  const { data, error } = await supabase
    .from('support_tickets')
    .update({ status: safeStatus, updated_at: now })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return toTicket(data);
}

/**
 * Demo samples first, then reviewed scam tickets with matching lookup tokens.
 * Returns a public-safe summary (no reporter identity).
 */
export async function lookupSupportBlacklist(query) {
  const q = normalizeLookupQuery(query);
  if (q.length < 6) {
    return { hit: false, source: null, too_short: true };
  }

  const demo = BLACKLIST_DEMO_SAMPLES.find((row) =>
    row.tokens.some((t) => t === q || q.includes(t) || t.includes(q)),
  );
  if (demo) {
    return {
      hit: true,
      source: 'demo',
      too_short: false,
      label_key: demo.labelKey,
      note_key: demo.noteKey,
      scam_target_type: null,
    };
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const live = memoryTickets.find(
      (row) =>
        row.kind === 'scam' &&
        row.status === 'reviewed' &&
        Array.isArray(row.lookup_tokens) &&
        row.lookup_tokens.some((t) => t === q || q.includes(t) || t.includes(q)),
    );
    if (!live) return { hit: false, source: null, too_short: false };
    return {
      hit: true,
      source: 'live',
      too_short: false,
      label_key: 'supportHub.blacklist.liveHit',
      note_key: 'supportHub.blacklist.liveNote',
      scam_target_type: live.scam_target_type || null,
    };
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, scam_target_type, lookup_tokens')
    .eq('kind', 'scam')
    .eq('status', 'reviewed')
    .contains('lookup_tokens', [q])
    .limit(1);
  if (error) throw error;

  let live = (data ?? [])[0] || null;
  if (!live) {
    // Fallback: contains exact token only — also try overlap via filter in memory for partial matches
    const { data: reviewed, error: reviewedError } = await supabase
      .from('support_tickets')
      .select('id, scam_target_type, lookup_tokens')
      .eq('kind', 'scam')
      .eq('status', 'reviewed')
      .limit(200);
    if (reviewedError) throw reviewedError;
    live =
      (reviewed ?? []).find((row) =>
        Array.isArray(row.lookup_tokens)
          ? row.lookup_tokens.some((t) => t === q || (t.length >= 6 && (q.includes(t) || t.includes(q))))
          : false,
      ) || null;
  }

  if (!live) return { hit: false, source: null, too_short: false };
  return {
    hit: true,
    source: 'live',
    too_short: false,
    label_key: 'supportHub.blacklist.liveHit',
    note_key: 'supportHub.blacklist.liveNote',
    scam_target_type: live.scam_target_type || null,
  };
}
