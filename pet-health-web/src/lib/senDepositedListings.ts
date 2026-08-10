/** Account helpers for Sen soft-deposit listings. */

export function isSenAccountRole(
  role: string | null | undefined,
  isAdmin = false,
): boolean {
  if (isAdmin) return false;
  const r = String(role || "")
    .trim()
    .toLowerCase();
  if (r === "sen") return true;
  if (r === "breeder" || r === "vet" || r === "admin") return false;
  return true;
}

/** Show "Thú cưng đã cọc" on Account for Sen (and Sen-like) users. */
export function shouldShowSenDepositedSection(input: {
  role: string | null | undefined;
  isAdmin?: boolean;
}): boolean {
  return isSenAccountRole(input.role, Boolean(input.isAdmin));
}
