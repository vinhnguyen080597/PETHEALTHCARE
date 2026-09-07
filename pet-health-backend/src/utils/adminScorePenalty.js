import { getComplianceScoreFromMetadata } from './breederComplianceScore.js';

export const ADMIN_SCORE_PENALTY_KINDS = ['transparency', 'compliance', 'review'];
export const ADMIN_SCORE_PENALTY_MIN = 1;
export const ADMIN_SCORE_PENALTY_MAX = 100;

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

export function normalizeAdminPenaltyKind(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (raw === 'transparency' || raw === 'minh_bach') return 'transparency';
  if (raw === 'compliance' || raw === 'tuan_thu') return 'compliance';
  if (raw === 'review' || raw === 'evaluation' || raw === 'danh_gia') return 'review';
  return '';
}

export function parseAdminScorePenaltyInput(body) {
  const rawPoints = body?.penaltyPoints ?? body?.penalty_points;
  const rawKind = body?.penaltyKind ?? body?.penalty_kind;
  const hasPoints = !(rawPoints === undefined || rawPoints === null || String(rawPoints).trim() === '');
  const kind = normalizeAdminPenaltyKind(rawKind);

  if (!hasPoints && !kind) {
    return { ok: true, penaltyPoints: 0, penaltyKind: '' };
  }
  if (!hasPoints || !kind) {
    return {
      ok: false,
      error: 'penaltyPoints and penaltyKind are required together',
      code: 'INVALID_SCORE_PENALTY',
    };
  }

  const pts = Math.round(Number(rawPoints));
  if (!Number.isFinite(pts) || pts < ADMIN_SCORE_PENALTY_MIN || pts > ADMIN_SCORE_PENALTY_MAX) {
    return {
      ok: false,
      error: `penaltyPoints must be an integer from ${ADMIN_SCORE_PENALTY_MIN} to ${ADMIN_SCORE_PENALTY_MAX}`,
      code: 'INVALID_PENALTY_POINTS',
    };
  }

  return { ok: true, penaltyPoints: pts, penaltyKind: kind };
}

export function applyAdminScorePenalty(metadata, input = {}, now = new Date()) {
  const meta = { ...asObject(metadata) };
  const kind = normalizeAdminPenaltyKind(input.kind);
  const points = Math.round(Number(input.points));
  if (!kind || !Number.isFinite(points) || points < ADMIN_SCORE_PENALTY_MIN) {
    return { metadata: meta, applied: false, kind: '', points: 0, scoreBefore: null, scoreAfter: null };
  }

  const safePoints = Math.min(ADMIN_SCORE_PENALTY_MAX, Math.max(ADMIN_SCORE_PENALTY_MIN, points));
  const createdAt = now instanceof Date ? now.toISOString() : String(now || new Date().toISOString());
  const eventId = String(input.eventId || `adm_${Date.parse(createdAt) || Date.now()}`);
  const reason = String(input.reason || '').trim().slice(0, 500);

  let scoreBefore = null;
  let scoreAfter = null;

  if (kind === 'transparency') {
    scoreBefore = Math.max(0, Math.floor(Number(meta.admin_transparency_penalty) || 0));
    scoreAfter = scoreBefore + safePoints;
    meta.admin_transparency_penalty = scoreAfter;
  } else if (kind === 'compliance') {
    const prev = asObject(meta.compliance);
    const events = Array.isArray(prev.events) ? [...prev.events] : [];
    scoreBefore = getComplianceScoreFromMetadata(meta);
    scoreAfter = clampScore(scoreBefore - safePoints);
    events.push({
      id: eventId,
      reasonCode: 'admin_reject',
      points: safePoints,
      scoreAfter,
      createdAt,
    });
    meta.compliance = {
      ...prev,
      score: scoreAfter,
      updatedAt: createdAt,
      events,
      restrictions: { ...asObject(prev.restrictions) },
    };
  } else if (kind === 'review') {
    scoreBefore = Math.max(0, Math.floor(Number(meta.admin_review_penalty) || 0));
    scoreAfter = scoreBefore + safePoints;
    meta.admin_review_penalty = scoreAfter;
  }

  const log = Array.isArray(meta.admin_score_penalties) ? [...meta.admin_score_penalties] : [];
  log.push({
    id: eventId,
    kind,
    points: safePoints,
    reason: reason || undefined,
    createdAt,
  });
  meta.admin_score_penalties = log.slice(-50);

  return {
    metadata: meta,
    applied: true,
    kind,
    points: safePoints,
    scoreBefore,
    scoreAfter,
  };
}
