import test from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_PROXY_RULES,
  adminProxyBodySchema,
  normalizeAdminProxySegments,
  resolveAdminProxyRoute,
} from "../src/lib/api/validation/adminProxyAllowlist";

test("normalizeAdminProxySegments drops traversal segments", () => {
  assert.deepEqual(normalizeAdminProxySegments(["posts", "..", "x"]), ["posts", "x"]);
  assert.deepEqual(normalizeAdminProxySegments(["", "accounts"]), ["accounts"]);
});

test("resolveAdminProxyRoute allows Admin Console routes", () => {
  const cases: Array<[string, string[], string]> = [
    ["GET", ["posts"], "/admin/pet-feed/posts"],
    ["PUT", ["posts", "p1", "status"], "/admin/pet-feed/posts/p1/status"],
    ["POST", ["posts", "p1", "deal", "force-complete"], "/admin/pet-feed/posts/p1/deal/force-complete"],
    ["GET", ["breeders"], "/admin/breeder-profiles"],
    ["PUT", ["breeders", "u1", "status"], "/admin/breeder-profiles/u1/status"],
    ["GET", ["support-tickets"], "/admin/support-tickets"],
    ["GET", ["action-logs"], "/admin/action-logs"],
    ["POST", ["announcements"], "/pet-feed/announcements"],
    ["GET", ["my-announcements"], "/pet-feed/my-announcements"],
  ];

  for (const [method, segments, backendPath] of cases) {
    const resolved = resolveAdminProxyRoute(method, segments);
    assert.equal(resolved.ok, true, `${method} ${segments.join("/")}`);
    if (resolved.ok) assert.equal(resolved.backendPath, backendPath);
  }
});

test("resolveAdminProxyRoute denies sensitive backend-only paths", () => {
  const blocked = [
    ["GET", ["ai-ops-summary"]],
    ["POST", ["test-alert-email"]],
    ["POST", ["jobs", "auto-complete-handoffs"]],
    ["GET", ["users", "u1", "pets"]],
    ["DELETE", ["accounts", "u1"]],
    ["GET", ["../secret"]],
  ] as const;

  for (const [method, segments] of blocked) {
    const resolved = resolveAdminProxyRoute(method, [...segments]);
    assert.equal(resolved.ok, false, `${method} ${segments.join("/")} should be blocked`);
  }
});

test("admin proxy allowlist covers every declared rule template", () => {
  assert.ok(ADMIN_PROXY_RULES.length >= 20);
  for (const rule of ADMIN_PROXY_RULES) {
    const sampleSegments = rule.template
      .split("/")
      .filter(Boolean)
      .map((part) => (part.startsWith(":") ? "sample-id" : part));
    const resolved = resolveAdminProxyRoute(rule.methods[0], sampleSegments);
    assert.equal(resolved.ok, true, rule.template);
  }
});

test("adminProxyBodySchema exists for mutating console actions", () => {
  assert.ok(adminProxyBodySchema("PUT posts/:postId/status"));
  assert.ok(adminProxyBodySchema("POST accounts"));
  assert.ok(adminProxyBodySchema("PUT feature-flags"));
  assert.equal(adminProxyBodySchema("GET posts"), null);
});
