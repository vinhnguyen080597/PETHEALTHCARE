/** Soft-deposit Sen picker helpers. */

export type SenUserOption = {
  user_id: string;
  display_name: string;
  email: string;
};

export function formatSenOptionLabel(
  user: Pick<SenUserOption, "display_name" | "email">,
): string {
  const name = String(user.display_name || "").trim() || "Sen";
  const email = String(user.email || "").trim();
  return email ? `${name} - ${email}` : name;
}

export function filterSenUserOptions(
  users: SenUserOption[],
  query: string,
): SenUserOption[] {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return users;
  return users.filter((user) => {
    const haystack = [
      user.display_name,
      user.email,
      user.user_id,
      formatSenOptionLabel(user),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function normalizeSenUserOptions(
  rows: Array<{
    user_id?: string | null;
    display_name?: string | null;
    email?: string | null;
  } | null | undefined>,
): SenUserOption[] {
  const out: SenUserOption[] = [];
  for (const row of rows) {
    if (!row) continue;
    const user_id = String(row.user_id || "").trim();
    if (!user_id) continue;
    out.push({
      user_id,
      display_name: String(row.display_name || "").trim(),
      email: String(row.email || "").trim(),
    });
  }
  return out;
}

export function depositHoldSenLabel(
  senDisplayName: string | null | undefined,
  fallbackHoldBadge: string,
  withNameTemplate: string,
): string {
  const name = String(senDisplayName || "").trim();
  if (!name) return fallbackHoldBadge;
  return withNameTemplate.replace("{name}", name);
}
