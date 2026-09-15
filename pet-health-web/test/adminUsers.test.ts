import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  ADMIN_CREATE_PASSWORD_MIN,
  accountMatchesUserFilters,
  accountRoleChangeConfirmKey,
  accountRoleLabelKey,
  accountRowId,
  accountStatusChangeConfirmKey,
  accountStatusLabelKey,
  canSubmitCreateAccount,
  accountRoleChangeBlockKey,
  isLastActiveAdmin,
  isSelfAdminAccount,
  isValidAdminCreateIdentifier,
  normalizeAccountRole,
  normalizeAccountStatus,
} from "../src/lib/admin/users";

test("normalizeAccountRole and status fall back safely", () => {
  assert.equal(normalizeAccountRole("admin"), "admin");
  assert.equal(normalizeAccountRole("vet"), "sen");
  assert.equal(normalizeAccountStatus("suspended"), "suspended");
  assert.equal(normalizeAccountStatus(""), "active");
  assert.equal(accountRoleLabelKey("breeder"), "account.roles.breeder.title");
  assert.equal(accountStatusLabelKey("suspended"), "admin.users.status.suspended");
});

test("self and last-active-admin guards", () => {
  const accounts = [
    { user_id: "a1", primary_role: "admin", account_status: "active" },
    { user_id: "s1", primary_role: "sen", account_status: "active" },
    { user_id: "a2", primary_role: "admin", account_status: "suspended" },
  ];
  assert.equal(isSelfAdminAccount("a1", accounts[0]), true);
  assert.equal(isSelfAdminAccount("a1", accounts[1]), false);
  assert.equal(isLastActiveAdmin(accounts, "a1"), true);
  assert.equal(isLastActiveAdmin(accounts, "a2"), false);
  assert.equal(accountRowId({ id: "x", user_id: "u-9" }), "u-9");
});

test("accountRoleChangeBlockKey blocks self and last-admin demote only", () => {
  const accounts = [
    { user_id: "a1", primary_role: "admin", account_status: "active" },
    { user_id: "s1", primary_role: "sen", account_status: "active" },
  ];
  assert.equal(
    accountRoleChangeBlockKey({
      sessionUserId: "a1",
      account: accounts[0],
      accounts,
      nextRole: "sen",
    }),
    "admin.users.selfLocked",
  );
  assert.equal(
    accountRoleChangeBlockKey({
      sessionUserId: "a1",
      account: accounts[1],
      accounts,
      nextRole: "breeder",
    }),
    null,
  );
  assert.equal(
    accountRoleChangeBlockKey({
      sessionUserId: "s1",
      account: accounts[0],
      accounts,
      nextRole: "sen",
    }),
    "admin.users.lastAdmin",
  );
  const twoAdmins = [
    ...accounts,
    { user_id: "a2", primary_role: "admin", account_status: "active" },
  ];
  assert.equal(
    accountRoleChangeBlockKey({
      sessionUserId: "s1",
      account: twoAdmins[0],
      accounts: twoAdmins,
      nextRole: "sen",
    }),
    null,
  );
});

test("role and status change confirm keys", () => {
  assert.equal(accountRoleChangeConfirmKey("sen", "sen"), null);
  assert.equal(
    accountRoleChangeConfirmKey("sen", "admin"),
    "admin.users.confirmPromoteAdmin",
  );
  assert.equal(
    accountRoleChangeConfirmKey("admin", "sen"),
    "admin.users.confirmDemoteAdmin",
  );
  assert.equal(
    accountRoleChangeConfirmKey("sen", "breeder"),
    "admin.users.confirmChangeRole",
  );
  assert.equal(
    accountStatusChangeConfirmKey("suspended"),
    "admin.users.confirmSuspend",
  );
  assert.equal(
    accountStatusChangeConfirmKey("active"),
    "admin.users.confirmRestore",
  );
});

test("create-account client validation matches BFF floors", () => {
  assert.equal(isValidAdminCreateIdentifier("ab"), true);
  assert.equal(isValidAdminCreateIdentifier("a"), false);
  assert.equal(ADMIN_CREATE_PASSWORD_MIN, 8);
  assert.equal(
    canSubmitCreateAccount({
      email: "farm01",
      password: "12345678",
      displayName: "Farm One",
    }),
    true,
  );
  assert.equal(
    canSubmitCreateAccount({
      email: "farm01",
      password: "1234567",
      displayName: "Farm One",
    }),
    false,
  );
  assert.equal(
    canSubmitCreateAccount({
      email: "a@b.co",
      password: "12345678",
      displayName: "  ",
    }),
    false,
  );
});

test("accountMatchesUserFilters applies search, role, and status", () => {
  const row = {
    display_name: "Lan",
    email: "lan@example.com",
    login_identifier: "lan",
    primary_role: "breeder",
    account_status: "suspended",
  };
  assert.equal(
    accountMatchesUserFilters(row, { search: "", role: "all", status: "all" }),
    true,
  );
  assert.equal(
    accountMatchesUserFilters(row, {
      search: "lan@",
      role: "breeder",
      status: "suspended",
    }),
    true,
  );
  assert.equal(
    accountMatchesUserFilters(row, { search: "", role: "admin", status: "all" }),
    false,
  );
  assert.equal(
    accountMatchesUserFilters(row, { search: "", role: "all", status: "active" }),
    false,
  );
  assert.equal(
    accountMatchesUserFilters(row, { search: "zzz", role: "all", status: "all" }),
    false,
  );
});

test("user admin i18n keys exist in EN and VI", () => {
  for (const key of [
    "admin.users.status.active",
    "admin.users.status.suspended",
    "admin.users.suspend",
    "admin.users.restore",
    "admin.users.confirmSuspend",
    "admin.users.confirmRestore",
    "admin.users.confirmChangeRole",
    "admin.users.confirmPromoteAdmin",
    "admin.users.confirmDemoteAdmin",
    "admin.users.confirmCreateAdmin",
    "admin.users.self",
    "admin.users.selfLocked",
    "admin.users.lastAdmin",
    "admin.users.passwordHint",
    "admin.users.testAccount",
  ] as const) {
    assert.ok(en[key], `missing EN ${key}`);
    assert.ok(vi[key], `missing VI ${key}`);
  }
});
