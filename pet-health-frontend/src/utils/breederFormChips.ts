/** Chip styles for breeder form selections (web BreederProfile parity). */

export type BreederFormChipVariant = 'filled' | 'outline';

export function breederFormChipTone(
  active: boolean,
  variant: BreederFormChipVariant = 'outline',
): { container: string; text: string } {
  if (variant === 'filled') {
    // Species chips — filled amber when selected (web species buttons).
    return active
      ? { container: 'border-[#D97706] bg-[#D97706]', text: 'text-white' }
      : { container: 'border-[#F0E6D8] bg-white', text: 'text-[#5C4A3A]' };
  }
  // Type / registration-unit chips — outline amber when selected.
  return active
    ? { container: 'border-[#F97316] bg-white', text: 'text-[#F97316]' }
    : { container: 'border-transparent bg-[#F3F4F6]', text: 'text-[#1C1E21]' };
}
