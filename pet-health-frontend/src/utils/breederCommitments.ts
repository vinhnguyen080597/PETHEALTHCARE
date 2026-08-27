/** Stored transparency commitment keys (backend still expects both). */
export const BREEDER_TRANSPARENCY_COMMITMENTS = [
  'accurate_information',
  'app_only_verification',
] as const;

export type BreederTransparencyCommitment =
  (typeof BREEDER_TRANSPARENCY_COMMITMENTS)[number];

export function hasAllBreederCommitments(
  commitments: readonly string[] | null | undefined,
): boolean {
  const list = commitments ?? [];
  return BREEDER_TRANSPARENCY_COMMITMENTS.every((key) => list.includes(key));
}

/** Single checkbox toggles both stored commitment keys. */
export function setBreederCommitmentsAccepted(
  commitments: readonly string[] | null | undefined,
  accepted: boolean,
): string[] {
  const current = [...(commitments ?? [])];
  if (accepted) {
    const next = new Set(current);
    for (const key of BREEDER_TRANSPARENCY_COMMITMENTS) next.add(key);
    return [...next];
  }
  return current.filter(
    (key) => !(BREEDER_TRANSPARENCY_COMMITMENTS as readonly string[]).includes(key as BreederTransparencyCommitment),
  );
}
