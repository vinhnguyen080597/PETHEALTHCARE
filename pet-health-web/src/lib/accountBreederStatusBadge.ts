/**
 * Temporary: do not show the Account “verified breeder” mark until
 * real eligibility rules ship. Other statuses (pending / rejected / …)
 * still surface so owners know request state.
 */
export function showAccountBreederStatusBadge(status: string): boolean {
  return String(status || "").toLowerCase() !== "verified";
}
