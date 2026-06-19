export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatBirthDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseBirthDateIso(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return startOfDay(date);
}

export function birthDateToAgeMonths(birthDate: Date | string, today = new Date()): number {
  const birth = typeof birthDate === 'string' ? parseBirthDateIso(birthDate) : startOfDay(birthDate);
  if (!birth) return 0;
  const now = startOfDay(today);
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

export function approximateBirthDateFromAgeMonths(ageMonths: number, today = new Date()): Date {
  const date = startOfDay(today);
  date.setMonth(date.getMonth() - Math.max(0, Math.round(ageMonths)));
  return date;
}

export type PetAgeBreakdown = {
  years: number;
  months: number;
  days: number;
};

export function calculateAgeBreakdown(birthDate: Date | string, today = new Date()): PetAgeBreakdown | null {
  const birth = typeof birthDate === 'string' ? parseBirthDateIso(birthDate) : startOfDay(birthDate);
  if (!birth) return null;
  const end = startOfDay(today);
  if (end < birth) return { years: 0, months: 0, days: 0 };

  let years = end.getFullYear() - birth.getFullYear();
  let months = end.getMonth() - birth.getMonth();
  let days = end.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
}

export function formatPetAgeBreakdown(
  breakdown: PetAgeBreakdown,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const parts: string[] = [];
  if (breakdown.years > 0) parts.push(t('petAge.years', { count: breakdown.years }));
  if (breakdown.months > 0) parts.push(t('petAge.months', { count: breakdown.months }));
  if (breakdown.days > 0 || parts.length === 0) parts.push(t('petAge.days', { count: breakdown.days }));
  return parts.join(' ');
}

export function formatPetAgeForDisplay(
  pet: { birth_date?: string | null; age?: number | null },
  t: (key: string, opts?: Record<string, unknown>) => string,
  today = new Date(),
): string {
  if (pet.birth_date) {
    const breakdown = calculateAgeBreakdown(pet.birth_date.slice(0, 10), today);
    if (breakdown) return formatPetAgeBreakdown(breakdown, t);
  }
  if (pet.age != null && Number.isFinite(pet.age)) {
    const breakdown = calculateAgeBreakdown(approximateBirthDateFromAgeMonths(pet.age, today), today);
    if (breakdown) return formatPetAgeBreakdown(breakdown, t);
  }
  return t('profile.ageNotSet');
}

export function resolvePetAgeMonths(pet: { birth_date?: string | null; age?: number | null }): number | null {
  if (pet.birth_date) return birthDateToAgeMonths(pet.birth_date);
  if (pet.age != null && Number.isFinite(pet.age)) return pet.age;
  return null;
}

export function petBirthDateForForm(pet: { birth_date?: string | null; age?: number | null }): string {
  if (pet.birth_date) return pet.birth_date.slice(0, 10);
  if (pet.age != null && Number.isFinite(pet.age)) {
    return formatBirthDateIso(approximateBirthDateFromAgeMonths(pet.age));
  }
  return '';
}
