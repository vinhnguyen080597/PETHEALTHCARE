/** Owner attach-warranty popup helpers (listing detail). */

/** Sentinel dropdown value for explicit "No warranty". */
export const NO_WARRANTY_POLICY_ID = "";

export type WarrantyPolicyOption = {
  id: string;
  title: string;
};

export function normalizeWarrantyPolicyOptions(
  rows: Array<{ id?: string | null; title?: string | null } | null | undefined>,
): WarrantyPolicyOption[] {
  const out: WarrantyPolicyOption[] = [];
  for (const row of rows) {
    if (!row) continue;
    const id = String(row.id || "").trim();
    const title = String(row.title || "").trim();
    if (!id || !title) continue;
    out.push({ id, title });
  }
  return out;
}

export function isNoWarrantyPolicyId(
  policyId: string | null | undefined,
): boolean {
  return String(policyId || "").trim() === NO_WARRANTY_POLICY_ID;
}

/** "Không bảo hành" (empty id) is a valid explicit choice. */
export function canSubmitAttachedWarrantyPolicy(
  _policyId: string | null | undefined,
): boolean {
  return true;
}

/** Payload for API: null clears warranty on the listing. */
export function warrantyPolicyIdForApi(
  policyId: string | null | undefined,
): string | null {
  const id = String(policyId || "").trim();
  return id || null;
}

/** Avoid losing deposit CTA if warranty save returns a demoted status. */
export function mergeListingAfterWarrantyAttach<
  T extends { status?: string | null },
>(previous: T, next: T): T {
  if (previous.status === "published" && next.status === "pending_review") {
    return { ...next, status: "published" };
  }
  return next;
}
