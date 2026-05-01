import type { Severity } from '../types';

export function severityCardClass(severity: Severity) {
  if (severity === 'high') return 'text-red-700 bg-red-50 border-red-200';
  if (severity === 'medium') return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-emerald-700 bg-emerald-50 border-emerald-200';
}
