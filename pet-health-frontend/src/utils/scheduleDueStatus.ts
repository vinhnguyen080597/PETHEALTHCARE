export type ScheduleDueStatus = 'upcoming' | 'due_today' | 'overdue';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDueDate(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? startOfDay(value) : null;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed.includes('T') ? trimmed : `${trimmed}T00:00:00`);
  return Number.isFinite(parsed.getTime()) ? startOfDay(parsed) : null;
}

export function resolveScheduleDueStatus(dueAt: string | Date, today: Date = new Date()): ScheduleDueStatus | null {
  const dueDate = parseDueDate(dueAt);
  if (!dueDate) return null;

  const dueTime = dueDate.getTime();
  const todayTime = startOfDay(today).getTime();

  if (dueTime > todayTime) return 'upcoming';
  if (dueTime === todayTime) return 'due_today';
  return 'overdue';
}

export function scheduleDueStatusTextClass(status: ScheduleDueStatus): string {
  if (status === 'overdue') return 'text-xs font-semibold text-red-600';
  if (status === 'due_today') return 'text-xs font-semibold text-amber-600';
  return 'text-xs font-semibold text-slate-500';
}
