/** Short brand mark for header wordmark accent. */
export const BRAND_NAME_SHORT = 'Pethub';

/** Split full title into orange lead ("Pethub") + neutral remainder (": Pet Marketplace"). */
export function splitBrandName(name: string): { lead: string; rest: string } {
  if (name.startsWith(BRAND_NAME_SHORT)) {
    return { lead: BRAND_NAME_SHORT, rest: name.slice(BRAND_NAME_SHORT.length) };
  }
  return { lead: name, rest: '' };
}
