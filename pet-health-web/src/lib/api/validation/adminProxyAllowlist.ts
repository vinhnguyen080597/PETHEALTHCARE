import { z } from "zod";
import { DEFAULT_APP_FEATURE_FLAGS, type AppFeatureFlags } from "../../featureFlags";

export const ADMIN_PROXY_MAX_SEGMENTS = 6;
export const ADMIN_PROXY_ID_SEGMENT = /^[a-zA-Z0-9_-]{1,80}$/;

export type AdminHttpMethod = "GET" | "PUT" | "POST" | "PATCH" | "DELETE";

type AdminProxyRule = {
  methods: readonly AdminHttpMethod[];
  template: string;
  backend: (params: Record<string, string>, method: AdminHttpMethod) => string;
};

function enc(value: string): string {
  return encodeURIComponent(value);
}

/** Explicit BFF → backend routes used by Admin Console (deny-by-default). */
export const ADMIN_PROXY_RULES: readonly AdminProxyRule[] = [
  { methods: ["GET"], template: "posts", backend: () => "/admin/pet-feed/posts" },
  {
    methods: ["PUT"],
    template: "posts/:postId/status",
    backend: ({ postId }) => `/admin/pet-feed/posts/${enc(postId)}/status`,
  },
  {
    methods: ["POST"],
    template: "posts/:postId/deal/force-complete",
    backend: ({ postId }) => `/admin/pet-feed/posts/${enc(postId)}/deal/force-complete`,
  },
  {
    methods: ["POST"],
    template: "posts/:postId/deal/force-cancel",
    backend: ({ postId }) => `/admin/pet-feed/posts/${enc(postId)}/deal/force-cancel`,
  },
  { methods: ["GET"], template: "reports", backend: () => "/admin/pet-feed/reports" },
  {
    methods: ["PUT"],
    template: "reports/:reportId/status",
    backend: ({ reportId }) => `/admin/pet-feed/reports/${enc(reportId)}/status`,
  },
  { methods: ["GET"], template: "breeders", backend: () => "/admin/breeder-profiles" },
  {
    methods: ["PUT"],
    template: "breeders/:userId/status",
    backend: ({ userId }) => `/admin/breeder-profiles/${enc(userId)}/status`,
  },
  {
    methods: ["GET"],
    template: "breeder-submissions",
    backend: () => "/admin/breeder-submissions",
  },
  {
    methods: ["PUT"],
    template: "breeder-submissions/:submissionId/status",
    backend: ({ submissionId }) =>
      `/admin/breeder-submissions/${enc(submissionId)}/status`,
  },
  {
    methods: ["GET"],
    template: "transparency-warnings",
    backend: () => "/admin/transparency-warnings",
  },
  {
    methods: ["PUT"],
    template: "transparency-warnings/:warningId/resolve",
    backend: ({ warningId }) =>
      `/admin/transparency-warnings/${enc(warningId)}/resolve`,
  },
  { methods: ["GET"], template: "accounts", backend: () => "/admin/accounts" },
  { methods: ["POST"], template: "accounts", backend: () => "/admin/accounts" },
  {
    methods: ["PUT"],
    template: "accounts/:userId",
    backend: ({ userId }) => `/admin/accounts/${enc(userId)}`,
  },
  { methods: ["GET"], template: "feature-flags", backend: () => "/admin/feature-flags" },
  { methods: ["PUT"], template: "feature-flags", backend: () => "/admin/feature-flags" },
  {
    methods: ["GET"],
    template: "support-tickets",
    backend: () => "/admin/support-tickets",
  },
  {
    methods: ["PUT"],
    template: "support-tickets/:ticketId/status",
    backend: ({ ticketId }) => `/admin/support-tickets/${enc(ticketId)}/status`,
  },
  { methods: ["GET"], template: "action-logs", backend: () => "/admin/action-logs" },
  {
    methods: ["POST"],
    template: "announcements",
    backend: () => "/pet-feed/announcements",
  },
  {
    methods: ["PUT"],
    template: "announcements/:postId",
    backend: ({ postId }) => `/admin/announcements/${enc(postId)}`,
  },
  {
    methods: ["GET"],
    template: "my-announcements",
    backend: () => "/pet-feed/my-announcements",
  },
] as const;

const featureFlagKeys = Object.keys(
  DEFAULT_APP_FEATURE_FLAGS,
) as (keyof AppFeatureFlags)[];

const featureFlagPatchSchema = z
  .object(
    Object.fromEntries(
      featureFlagKeys.map((key) => [key, z.boolean().optional()]),
    ) as Record<keyof AppFeatureFlags, z.ZodOptional<z.ZodBoolean>>,
  )
  .strict()
  .refine(
    (value) => featureFlagKeys.some((key) => value[key] !== undefined),
    "At least one feature flag key is required",
  );

const adminStatusBodySchema = z
  .object({
    status: z.string().trim().min(1).max(40),
    rejectionReason: z.string().trim().max(500).optional(),
    adminAction: z.string().trim().max(300).optional(),
    adminNote: z.string().trim().max(500).optional(),
  })
  .strict();

export const ADMIN_PROXY_BODY_SCHEMAS: Record<string, z.ZodType> = {
  "PUT posts/:postId/status": adminStatusBodySchema,
  "PUT reports/:reportId/status": z.object({ status: z.string().trim().min(1).max(40) }).strict(),
  "PUT support-tickets/:ticketId/status": z
    .object({ status: z.string().trim().min(1).max(40) })
    .strict(),
  "PUT breeders/:userId/status": z
    .object({
      verificationStatus: z.string().trim().min(1).max(40),
      rejectionReason: z.string().trim().max(500).optional(),
      adminAction: z.string().trim().max(300).optional(),
      adminNote: z.string().trim().max(500).optional(),
    })
    .strict(),
  "PUT breeder-submissions/:submissionId/status": adminStatusBodySchema,
  "PUT transparency-warnings/:warningId/resolve": z
    .object({ resolution: z.enum(["uphold", "restore"]) })
    .strict(),
  "PUT accounts/:userId": z
    .object({
      primaryRole: z.enum(["sen", "breeder", "admin"]).optional(),
      accountStatus: z.enum(["active", "suspended"]).optional(),
      displayName: z.string().trim().max(120).optional(),
    })
    .strict()
    .refine(
      (value) =>
        value.primaryRole !== undefined
        || value.accountStatus !== undefined
        || value.displayName !== undefined,
      "At least one account field is required",
    ),
  "POST accounts": z
    .object({
      email: z.string().trim().email().max(320),
      password: z.string().min(8).max(128),
      displayName: z.string().trim().min(1).max(120),
      primaryRole: z.enum(["sen", "breeder", "admin"]),
    })
    .strict(),
  "PUT feature-flags": featureFlagPatchSchema,
  "POST posts/:postId/deal/force-complete": z.object({}).strict(),
  "POST posts/:postId/deal/force-cancel": z.object({}).strict(),
};

export function normalizeAdminProxySegments(path: string[] | undefined): string[] {
  return (path ?? [])
    .map((segment) => String(segment || "").trim())
    .filter(Boolean)
    .filter((segment) => segment !== "." && segment !== "..");
}

function matchTemplate(
  template: string,
  segments: string[],
): Record<string, string> | null {
  const parts = template.split("/").filter(Boolean);
  if (parts.length !== segments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < parts.length; i += 1) {
    const expected = parts[i];
    const actual = segments[i];
    if (!actual) return null;
    if (expected.startsWith(":")) {
      if (!ADMIN_PROXY_ID_SEGMENT.test(actual)) return null;
      params[expected.slice(1)] = actual;
      continue;
    }
    if (expected !== actual) return null;
  }
  return params;
}

export type AdminProxyResolveResult =
  | {
      ok: true;
      backendPath: string;
      bodySchemaKey: string;
    }
  | {
      ok: false;
      code: "ADMIN_PROXY_PATH_NOT_ALLOWED" | "ADMIN_PROXY_PATH_INVALID";
    };

export function resolveAdminProxyRoute(
  method: string,
  segments: string[],
): AdminProxyResolveResult {
  const normalized = normalizeAdminProxySegments(segments);
  if (normalized.length === 0 || normalized.length > ADMIN_PROXY_MAX_SEGMENTS) {
    return { ok: false, code: "ADMIN_PROXY_PATH_INVALID" };
  }

  const httpMethod = method.toUpperCase() as AdminHttpMethod;
  for (const rule of ADMIN_PROXY_RULES) {
    if (!rule.methods.includes(httpMethod)) continue;
    const params = matchTemplate(rule.template, normalized);
    if (!params) continue;
    return {
      ok: true,
      backendPath: rule.backend(params, httpMethod),
      bodySchemaKey: `${httpMethod} ${rule.template}`,
    };
  }
  return { ok: false, code: "ADMIN_PROXY_PATH_NOT_ALLOWED" };
}

export function adminProxyBodySchema(bodySchemaKey: string): z.ZodType | null {
  return ADMIN_PROXY_BODY_SCHEMAS[bodySchemaKey] ?? null;
}
