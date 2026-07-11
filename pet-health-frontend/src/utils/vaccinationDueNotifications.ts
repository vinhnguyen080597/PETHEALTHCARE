import type { CoreCareRecord } from '../types';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isVaccinationDueDate(dueAt: string, today: Date = new Date()): boolean {
  const trimmed = dueAt.trim();
  if (!trimmed) return false;
  const parsed = new Date(trimmed.includes('T') ? trimmed : `${trimmed}T00:00:00`);
  if (!Number.isFinite(parsed.getTime())) return false;
  return startOfDay(parsed).getTime() <= startOfDay(today).getTime();
}

function isPendingDueRecord(record: CoreCareRecord): boolean {
  if (!record.due_at || record.status === 'done') return false;
  if (record.type === 'vaccine') return false;
  return true;
}

export function isVaccinationScheduleDueRecord(record: CoreCareRecord, today: Date = new Date()): boolean {
  if (!isPendingDueRecord(record) || !record.due_at) return false;
  return isVaccinationDueDate(record.due_at, today);
}

export function countVaccinationScheduleDue(records: CoreCareRecord[], today: Date = new Date()): number {
  return records.filter((record) => isVaccinationScheduleDueRecord(record, today)).length;
}

export function countVaccinationScheduleDueByPet(
  recordsByPetId: Record<string, CoreCareRecord[]>,
  today: Date = new Date(),
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(recordsByPetId).map(([petId, records]) => [
      petId,
      countVaccinationScheduleDue(records, today),
    ]),
  );
}

export function totalVaccinationScheduleDue(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}
