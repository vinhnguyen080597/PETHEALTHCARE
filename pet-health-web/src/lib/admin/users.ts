export const ADMIN_USER_ROLES = ["sen", "breeder", "admin"] as const;
export type AdminUserRole = (typeof ADMIN_USER_ROLES)[number];

export const ADMIN_USER_ROLE_FILTERS = ["all", ...ADMIN_USER_ROLES] as const;
export type AdminUserRoleFilter = (typeof ADMIN_USER_ROLE_FILTERS)[number];

export const ADMIN_USER_STATUS_FILTERS = ["all", "active", "suspended"] as const;
export type AdminUserStatusFilter = (typeof ADMIN_USER_STATUS_FILTERS)[number];

/** Web BFF create-account password floor (backend allows 6). */
export const ADMIN_CREATE_PASSWORD_MIN = 8;

export type AdminAccountRow = {
  id?: string;
  user_id?: string;
  email?: string | null;
  display_name?: string | null;
  login_identifier?: string | null;
  primary_role?: string | null;
  account_status?: string | null;
  isForTesting?: boolean;
};

export function isAdminUserRole(
  value: string | null | undefined,
): value is AdminUserRole {
  return (ADMIN_USER_ROLES as readonly string[]).includes(
    String(value || "").trim().toLowerCase(),
  );
}

export function isAdminUserRoleFilter(
  value: string | null | undefined,
): value is AdminUserRoleFilter {
  return (ADMIN_USER_ROLE_FILTERS as readonly string[]).includes(
    String(value || "").trim().toLowerCase(),
  );
}

export function isAdminUserStatusFilter(
  value: string | null | undefined,
): value is AdminUserStatusFilter {
  return (ADMIN_USER_STATUS_FILTERS as readonly string[]).includes(
    String(value || "").trim().toLowerCase(),
  );
}

export function normalizeAccountRole(
  value: string | null | undefined,
): AdminUserRole {
  const role = String(value || "").trim().toLowerCase();
  return isAdminUserRole(role) ? role : "sen";
}

export function normalizeAccountStatus(
  value: string | null | undefined,
): Exclude<AdminUserStatusFilter, "all"> {
  return String(value || "").trim().toLowerCase() === "suspended"
    ? "suspended"
    : "active";
}

export function accountRoleLabelKey(
  role: string | null | undefined,
): `account.roles.${AdminUserRole}.title` {
  return `account.roles.${normalizeAccountRole(role)}.title`;
}

export function accountStatusLabelKey(
  status: string | null | undefined,
): "admin.users.status.suspended" | "admin.users.status.active" {
  return normalizeAccountStatus(status) === "suspended"
    ? "admin.users.status.suspended"
    : "admin.users.status.active";
}

export function accountRowId(account: AdminAccountRow): string {
  return String(account.user_id || account.id || "").trim();
}

export function isSelfAdminAccount(
  sessionUserId: string | null | undefined,
  account: AdminAccountRow,
): boolean {
  const self = String(sessionUserId || "").trim();
  const id = accountRowId(account);
  return Boolean(self) && Boolean(id) && self === id;
}

export function isLastActiveAdmin(
  accounts: AdminAccountRow[],
  userId: string | null | undefined,
): boolean {
  const id = String(userId || "").trim();
  if (!id) return false;
  const activeAdmins = accounts.filter(
    (account) =>
      normalizeAccountRole(account.primary_role) === "admin" &&
      normalizeAccountStatus(account.account_status) === "active",
  );
  if (activeAdmins.length !== 1) return false;
  return accountRowId(activeAdmins[0]) === id;
}

export function accountRoleChangeConfirmKey(
  from: string | null | undefined,
  to: string | null | undefined,
):
  | "admin.users.confirmPromoteAdmin"
  | "admin.users.confirmDemoteAdmin"
  | "admin.users.confirmChangeRole"
  | null {
  const next = String(to || "").trim().toLowerCase();
  const prev = String(from || "").trim().toLowerCase();
  if (!isAdminUserRole(next) || next === prev) return null;
  if (next === "admin") return "admin.users.confirmPromoteAdmin";
  if (prev === "admin") return "admin.users.confirmDemoteAdmin";
  return "admin.users.confirmChangeRole";
}

/**
 * Why a role change must not run. Callers should revert the select, then
 * confirm() — never confirm() inside the change event while the native value
 * already moved (Chrome/React leave the dropdown on the new role).
 */
export function accountRoleChangeBlockKey(opts: {
  sessionUserId?: string | null;
  account: AdminAccountRow;
  accounts: AdminAccountRow[];
  nextRole: string | null | undefined;
}): "admin.users.selfLocked" | "admin.users.lastAdmin" | null {
  if (isSelfAdminAccount(opts.sessionUserId, opts.account)) {
    return "admin.users.selfLocked";
  }
  const next = String(opts.nextRole || "").trim().toLowerCase();
  const current = normalizeAccountRole(opts.account.primary_role);
  if (
    current === "admin" &&
    next !== "admin" &&
    isLastActiveAdmin(opts.accounts, accountRowId(opts.account))
  ) {
    return "admin.users.lastAdmin";
  }
  return null;
}

export function accountStatusChangeConfirmKey(
  status: string | null | undefined,
): "admin.users.confirmSuspend" | "admin.users.confirmRestore" | null {
  const value = String(status || "").trim().toLowerCase();
  if (value === "suspended") return "admin.users.confirmSuspend";
  if (value === "active") return "admin.users.confirmRestore";
  return null;
}

export function isValidAdminCreateIdentifier(value: string): boolean {
  const identifier = String(value || "").trim();
  return identifier.length >= 2 && identifier.length <= 120;
}

export function canSubmitCreateAccount(input: {
  email: string;
  password: string;
  displayName: string;
}): boolean {
  const name = String(input.displayName || "").trim();
  return (
    isValidAdminCreateIdentifier(input.email) &&
    String(input.password || "").length >= ADMIN_CREATE_PASSWORD_MIN &&
    name.length >= 1 &&
    name.length <= 120
  );
}

export function accountMatchesUserFilters(
  account: AdminAccountRow,
  opts: {
    search: string;
    role: AdminUserRoleFilter;
    status: AdminUserStatusFilter;
  },
): boolean {
  if (
    opts.role !== "all" &&
    normalizeAccountRole(account.primary_role) !== opts.role
  ) {
    return false;
  }
  if (
    opts.status !== "all" &&
    normalizeAccountStatus(account.account_status) !== opts.status
  ) {
    return false;
  }
  const query = opts.search.trim().toLowerCase();
  if (!query) return true;
  return [
    account.display_name,
    account.email,
    account.login_identifier,
    account.primary_role,
  ].some((value) => String(value ?? "").toLowerCase().includes(query));
}
