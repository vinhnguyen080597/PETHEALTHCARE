import type { Analysis, CoreCareRecord } from '../types';

export type CarePassportStats = {
  pendingReminders: CoreCareRecord[];
  overdueReminders: CoreCareRecord[];
  nextReminder: CoreCareRecord | null;
  latestVaccine: CoreCareRecord | null;
  latestWeight: CoreCareRecord | null;
  latestVetVisit: CoreCareRecord | null;
  timeline: Array<
    | { kind: 'care'; record: CoreCareRecord; timestamp: string }
    | { kind: 'analysis'; analysis: Analysis; timestamp: string }
  >;
};

function timestamp(value?: string | null) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

export function metadataText(record: CoreCareRecord, key: string) {
  const value = record.metadata?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function metadataNumber(record: CoreCareRecord, key: string) {
  const value = Number(record.metadata?.[key]);
  return Number.isFinite(value) ? value : null;
}

export function buildCarePassportStats(records: CoreCareRecord[], history: Analysis[] = []): CarePassportStats {
  const now = Date.now();
  const pendingReminders = records
    .filter((record) => record.type === 'reminder' && record.status === 'pending')
    .sort((a, b) => timestamp(a.due_at || a.occurred_at) - timestamp(b.due_at || b.occurred_at));
  const overdueReminders = pendingReminders.filter((record) => record.due_at && timestamp(record.due_at) < now);
  const latestByType = (type: CoreCareRecord['type']) =>
    records
      .filter((record) => record.type === type)
      .sort((a, b) => timestamp(b.occurred_at) - timestamp(a.occurred_at))[0] ?? null;

  const careTimeline = records.map((record) => ({
    kind: 'care' as const,
    record,
    timestamp: record.occurred_at,
  }));
  const analysisTimeline = history.map((analysis) => ({
    kind: 'analysis' as const,
    analysis,
    timestamp: analysis.created_at,
  }));

  return {
    pendingReminders,
    overdueReminders,
    nextReminder: pendingReminders[0] ?? null,
    latestVaccine: latestByType('vaccine'),
    latestWeight: latestByType('weight'),
    latestVetVisit: latestByType('vet_visit'),
    timeline: [...careTimeline, ...analysisTimeline].sort((a, b) => timestamp(b.timestamp) - timestamp(a.timestamp)),
  };
}
