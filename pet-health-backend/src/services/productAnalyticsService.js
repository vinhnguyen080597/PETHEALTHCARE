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

export async function getProductAnalyticsSummary() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  let rows = memoryEvents.filter((row) => row.created_at >= since);
  const supabase = analyticsDisabled ? null : getSupabaseServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from('app_events').select('event,created_at').gte('created_at', since);
    if (error) {
      if (isMissingAnalyticsTable(error)) {
        analyticsDisabled = true;
      } else {
        throw error;
      }
    } else {
      rows = data ?? [];
    }
  }
  const byEvent = {};
  for (const row of rows) {
    const key = row.event || 'unknown';
    byEvent[key] = (byEvent[key] ?? 0) + 1;
  }
  return {
    windowDays: 30,
    totalEvents: rows.length,
    byEvent,
  };
}
