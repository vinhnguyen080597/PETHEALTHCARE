import { randomUUID } from 'node:crypto';
import { getSupabaseServiceClient } from '../config/supabase.js';

const memoryEvents = [];
let analyticsDisabled = false;

function isMissingAnalyticsTable(error) {
  if (!error) return false;
  const text = [error.message, error.details, error.hint, String(error.code ?? '')].filter(Boolean).join(' ');
  return /app_events|42P01|PGRST205|relation .* does not exist/i.test(text);
}

export async function recordProductEvent({ userId, petId = null, event, metadata = {} }) {
  if (!userId || !event) return null;
  const row = {
    id: randomUUID(),
    user_id: userId,
    pet_id: petId,
    event,
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    created_at: new Date().toISOString(),
  };
  const supabase = analyticsDisabled ? null : getSupabaseServiceClient();
  if (!supabase) {
    memoryEvents.push(row);
    return row;
  }
  const { error } = await supabase.from('app_events').insert(row);
  if (error) {
    if (isMissingAnalyticsTable(error)) {
      analyticsDisabled = true;
      memoryEvents.push(row);
      return row;
    }
    throw error;
  }
  return row;
}

function clampWindowDays(value, fallback = 30) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(90, Math.max(1, Math.floor(n)));
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dayKey(iso) {
  return String(iso || '').slice(0, 10);
}

function countByEvent(rows) {
  const byEvent = {};
  for (const row of rows) {
    const key = row.event || 'unknown';
    byEvent[key] = (byEvent[key] ?? 0) + 1;
  }
  return byEvent;
}

function uniqueUserCount(rows) {
  const ids = new Set();
  for (const row of rows) {
    if (row.user_id) ids.add(row.user_id);
  }
  return ids.size;
}

function sumEvents(byEvent, names) {
  return names.reduce((sum, name) => sum + (byEvent[name] ?? 0), 0);
}

async function loadAnalyticsRows(sinceIso) {
  let rows = memoryEvents.filter((row) => row.created_at >= sinceIso);
  const supabase = analyticsDisabled ? null : getSupabaseServiceClient();
  if (!supabase) return rows;
  const { data, error } = await supabase
    .from('app_events')
    .select('event,user_id,created_at')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true })
    .limit(20000);
  if (error) {
    if (isMissingAnalyticsTable(error)) {
      analyticsDisabled = true;
      return rows;
    }
    throw error;
  }
  return data ?? [];
}

export async function getProductAnalyticsSummary() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await loadAnalyticsRows(since);
  return {
    windowDays: 30,
    totalEvents: rows.length,
    byEvent: countByEvent(rows),
  };
}

/**
 * Admin Home product analytics (JWT admin or secret).
 * Active users = distinct user_id with any app_events in window (proxy until session events exist).
 * Conversion = contact events / active users.
 */
export async function getProductAnalyticsDashboard({ days = 7 } = {}) {
  const windowDays = clampWindowDays(days, 7);
  const now = new Date();
  const rangeMs = windowDays * 24 * 60 * 60 * 1000;
  const currentStart = new Date(now.getTime() - rangeMs);
  const previousStart = new Date(currentStart.getTime() - rangeMs);
  const rows = await loadAnalyticsRows(previousStart.toISOString());

  const currentRows = rows.filter((row) => row.created_at >= currentStart.toISOString());
  const previousRows = rows.filter(
    (row) => row.created_at >= previousStart.toISOString() && row.created_at < currentStart.toISOString(),
  );

  const byEvent = countByEvent(currentRows);
  const prevByEvent = countByEvent(previousRows);
  const activeUsers = uniqueUserCount(currentRows);
  const prevActiveUsers = uniqueUserCount(previousRows);

  const contactEvents = [
    'pet_feed_conversation_opened',
    'pet_feed_message_sent',
  ];
  const engageEvents = [
    'pet_feed_post_favorited',
    'pet_feed_comment_created',
    'pet_feed_post_created',
  ];
  const contactCount = sumEvents(byEvent, contactEvents);
  const prevContactCount = sumEvents(prevByEvent, contactEvents);
  const engageCount = sumEvents(byEvent, engageEvents);
  const conversionRate = activeUsers > 0 ? Number(((contactCount / activeUsers) * 100).toFixed(1)) : 0;
  const prevConversionRate =
    prevActiveUsers > 0 ? Number(((prevContactCount / prevActiveUsers) * 100).toFixed(1)) : 0;

  const dailyMap = new Map();
  const startDay = startOfUtcDay(currentStart);
  for (let i = 0; i <= windowDays; i += 1) {
    const d = new Date(startDay.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { date: key, events: 0, uniqueUsers: new Set(), senEvents: 0, breederEvents: 0 });
  }
  for (const row of currentRows) {
    const key = dayKey(row.created_at);
    const bucket = dailyMap.get(key);
    if (!bucket) continue;
    bucket.events += 1;
    if (row.user_id) bucket.uniqueUsers.add(row.user_id);
    if (row.event === 'breeder_profile_upserted' || row.event === 'breeder_detail_submitted') {
      bucket.breederEvents += 1;
    }
    if (row.event === 'pet_created' || row.event === 'pet_feed_post_favorited' || row.event === 'pet_feed_comment_created') {
      bucket.senEvents += 1;
    }
  }
  const dailySeries = [...dailyMap.values()].map((bucket) => ({
    date: bucket.date,
    events: bucket.events,
    uniqueUsers: bucket.uniqueUsers.size,
    senSignals: bucket.senEvents,
    breederSignals: bucket.breederEvents,
  }));

  const hourCounts = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  for (const row of currentRows) {
    const hour = new Date(row.created_at).getUTCHours();
    if (Number.isFinite(hour)) hourCounts[hour].count += 1;
  }

  const funnel = [
    { key: 'active', label: 'active', value: activeUsers },
    { key: 'engage', label: 'engage', value: Math.min(activeUsers, engageCount) },
    { key: 'contact', label: 'contact', value: Math.min(activeUsers, contactCount) },
  ];

  function deltaPct(current, previous) {
    if (previous <= 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  return {
    windowDays,
    generatedAt: now.toISOString(),
    kpis: {
      activeUsers,
      activeUsersDeltaPct: deltaPct(activeUsers, prevActiveUsers),
      totalEvents: currentRows.length,
      totalEventsDeltaPct: deltaPct(currentRows.length, previousRows.length),
      contactActions: contactCount,
      contactActionsDeltaPct: deltaPct(contactCount, prevContactCount),
      conversionRate,
      conversionRateDeltaPct: deltaPct(conversionRate, prevConversionRate),
    },
    byEvent,
    dailySeries,
    peakHours: hourCounts,
    funnel,
    notes: {
      activeUsers: 'Distinct user_id with product events in window (proxy for DAU/MAU until session_open is instrumented).',
      conversion: 'Contact events (chat open/message) divided by active users.',
      peakHours: 'UTC hour buckets from app_events.created_at.',
      funnel: 'active → engage (favorite/comment/post) → contact (conversation/message).',
    },
  };
}
