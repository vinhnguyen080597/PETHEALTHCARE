import type { ApiAccount } from "./types";

/** Resolve the logged-in user id from a `/me` account payload. */
export function sessionAccountUserId(
  account: Pick<ApiAccount, "user_id" | "id"> | null | undefined,
): string | null {
  if (!account) return null;
  const id = String(account.user_id || account.id || "").trim();
  return id || null;
}
