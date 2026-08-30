import { z } from "zod";
import {
  BUYER_GUIDELINE_OPTIONS,
  EVIDENCE_OPTIONS,
  EXCLUSION_OPTIONS,
  MEDICAL_FEE_OPTIONS,
  CARE_PARVO_DAY_OPTIONS,
  CONGENITAL_DAY_OPTIONS,
  REPORT_HOUR_OPTIONS,
  RESPIRATORY_DAY_OPTIONS,
  RESPONSE_HOUR_OPTIONS,
  VACCINE_SHOT_OPTIONS,
} from "../../warrantyPolicyForm";
import {
  FEEDBACK_CATEGORIES,
  SCAM_TARGET_TYPES,
  SUPPORT_FEEDBACK_MAX_EVIDENCE,
  SUPPORT_SCAM_MAX_EVIDENCE,
} from "../../supportHub";
import {
  CANCEL_DEPOSIT_REASON_MAX,
  COMMENT_BODY_MAX,
  DEAL_DISPUTE_MESSAGE_MAX,
  DEAL_PHOTO_URLS_MAX,
  httpUrlListSchema,
  httpUrlSchema,
  MARK_NOTIFICATIONS_READ_MAX,
  MESSAGE_BODY_MAX,
  MESSAGE_MEDIA_MAX,
  REVIEW_COMMENT_MAX,
  trimmedString,
} from "./common";

const listingMetadataSchema = z
  .object({
    warranty_policy_id: z.string().trim().max(80).optional(),
    health_evidence_urls: httpUrlListSchema(10).optional(),
    video_poster_url: httpUrlSchema.optional(),
    list_thumb_url: httpUrlSchema.optional(),
  })
  .strict();

const ageMonthsSchema = z
  .union([z.number(), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;
    return Math.min(Math.max(Math.round(n), 0), 600);
  });

export const listingCreateBodySchema = z
  .object({
    title: trimmedString(1, 180),
    species: trimmedString(1, 32),
    breed: z.string().trim().max(120).optional(),
    gender: z.string().trim().max(32).optional(),
    ageMonths: ageMonthsSchema,
    age_months: ageMonthsSchema,
    location: z.string().trim().max(160).optional(),
    priceNote: z.string().trim().max(160).optional(),
    price_note: z.string().trim().max(160).optional(),
    description: z.string().trim().max(4000).optional(),
    vaccineStatus: z.string().trim().max(300).optional(),
    vaccine_status: z.string().trim().max(300).optional(),
    dewormingStatus: z.string().trim().max(300).optional(),
    deworming_status: z.string().trim().max(300).optional(),
    personality: z.array(z.string().trim().max(500)).max(8).optional(),
    paperwork: z.array(z.string().trim().max(500)).max(10).optional(),
    mediaUrls: httpUrlListSchema(10).optional(),
    media_urls: httpUrlListSchema(10).optional(),
    videoUrl: z.union([httpUrlSchema, z.literal("")]).optional(),
    video_url: z.union([httpUrlSchema, z.literal("")]).optional(),
    status: z.enum(["draft", "pending_review"]).optional(),
    metadata: listingMetadataSchema.optional(),
  })
  .strict()
  .transform((body) => {
    const metadata = body.metadata ? { ...body.metadata } : undefined;
    return {
      title: body.title,
      species: body.species,
      breed: body.breed ?? "",
      gender: body.gender ?? "",
      ageMonths: body.ageMonths ?? body.age_months,
      location: body.location ?? "",
      priceNote: body.priceNote ?? body.price_note ?? "",
      description: body.description ?? "",
      vaccineStatus: body.vaccineStatus ?? body.vaccine_status ?? "",
      dewormingStatus: body.dewormingStatus ?? body.deworming_status ?? "",
      personality: body.personality ?? [],
      paperwork: body.paperwork ?? [],
      mediaUrls: body.mediaUrls ?? body.media_urls ?? [],
      videoUrl: body.videoUrl ?? body.video_url ?? "",
      status: body.status,
      ...(metadata ? { metadata } : {}),
    };
  });


export const listingPatchBodySchema = z
  .object({
    title: trimmedString(1, 180).optional(),
    species: trimmedString(1, 32).optional(),
    breed: z.string().trim().max(120).optional(),
    gender: z.string().trim().max(32).optional(),
    ageMonths: ageMonthsSchema,
    age_months: ageMonthsSchema,
    location: z.string().trim().max(160).optional(),
    priceNote: z.string().trim().max(160).optional(),
    price_note: z.string().trim().max(160).optional(),
    description: z.string().trim().max(4000).optional(),
    vaccineStatus: z.string().trim().max(300).optional(),
    vaccine_status: z.string().trim().max(300).optional(),
    dewormingStatus: z.string().trim().max(300).optional(),
    deworming_status: z.string().trim().max(300).optional(),
    personality: z.array(z.string().trim().max(500)).max(8).optional(),
    paperwork: z.array(z.string().trim().max(500)).max(10).optional(),
    mediaUrls: httpUrlListSchema(10).optional(),
    media_urls: httpUrlListSchema(10).optional(),
    videoUrl: z.union([httpUrlSchema, z.literal("")]).optional(),
    video_url: z.union([httpUrlSchema, z.literal("")]).optional(),
    status: z.enum(["draft", "pending_review", "archived"]).optional(),
    metadata: listingMetadataSchema.optional(),
  })
  .strict()
  .transform((body) => {
    const out: Record<string, unknown> = {};
    if (body.title !== undefined) out.title = body.title;
    if (body.species !== undefined) out.species = body.species;
    if (body.breed !== undefined) out.breed = body.breed;
    if (body.gender !== undefined) out.gender = body.gender;
    const age = body.ageMonths ?? body.age_months;
    if (age !== undefined) out.ageMonths = age;
    if (body.location !== undefined) out.location = body.location;
    if (body.priceNote !== undefined || body.price_note !== undefined) {
      out.priceNote = body.priceNote ?? body.price_note;
    }
    if (body.description !== undefined) out.description = body.description;
    if (body.vaccineStatus !== undefined || body.vaccine_status !== undefined) {
      out.vaccineStatus = body.vaccineStatus ?? body.vaccine_status;
    }
    if (body.dewormingStatus !== undefined || body.deworming_status !== undefined) {
      out.dewormingStatus = body.dewormingStatus ?? body.deworming_status;
    }
    if (body.personality !== undefined) out.personality = body.personality;
    if (body.paperwork !== undefined) out.paperwork = body.paperwork;
    if (body.mediaUrls !== undefined || body.media_urls !== undefined) {
      out.mediaUrls = body.mediaUrls ?? body.media_urls;
    }
    if (body.videoUrl !== undefined || body.video_url !== undefined) {
      out.videoUrl = body.videoUrl ?? body.video_url;
    }
    if (body.status !== undefined) out.status = body.status;
    if (body.metadata !== undefined) out.metadata = body.metadata;
    return out;
  });

const vaccineShotsSchema = z.coerce
  .number()
  .int()
  .refine((value) => (VACCINE_SHOT_OPTIONS as readonly number[]).includes(value));
const careParvoDaysSchema = z.coerce
  .number()
  .int()
  .refine((value) => (CARE_PARVO_DAY_OPTIONS as readonly number[]).includes(value));
const respiratoryDaysSchema = z.coerce
  .number()
  .int()
  .refine((value) => (RESPIRATORY_DAY_OPTIONS as readonly number[]).includes(value));
const congenitalDaysSchema = z.coerce
  .number()
  .int()
  .refine((value) => (CONGENITAL_DAY_OPTIONS as readonly number[]).includes(value));
const reportHoursSchema = z.coerce
  .number()
  .int()
  .refine((value) => (REPORT_HOUR_OPTIONS as readonly number[]).includes(value));
const medicalFeeSchema = z.coerce
  .number()
  .int()
  .refine((value) => (MEDICAL_FEE_OPTIONS as readonly number[]).includes(value));
const responseHoursSchema = z.coerce
  .number()
  .int()
  .refine((value) => (RESPONSE_HOUR_OPTIONS as readonly number[]).includes(value));

const warrantyPolicyFieldsSchema = z.object({
  title: trimmedString(1, 160),
  vaccine_shots_count: vaccineShotsSchema,
  vaccine_types: z.string().trim().max(300).optional().default(""),
  deworming_note: z.string().trim().max(500).optional().default(""),
  has_health_book: z.boolean().optional().default(true),
  care_parvo_coverage_days: careParvoDaysSchema,
  respiratory_skin_coverage_days: respiratoryDaysSchema,
  congenital_coverage_days: congenitalDaysSchema,
  report_within_hours: reportHoursSchema,
  vet_requirement: z.enum(["licensed", "farm_designated", "either"]),
  buyer_guidelines: z.array(z.enum(BUYER_GUIDELINE_OPTIONS)).max(12).optional().default([]),
  exclusions: z.array(z.enum(EXCLUSION_OPTIONS)).max(12).optional().default([]),
  medical_fee_support_percent: medicalFeeSchema,
  allow_equivalent_swap: z.boolean().optional().default(true),
  shipping_party: z.enum(["buyer", "breeder", "split"]),
  evidence_required: z.array(z.enum(EVIDENCE_OPTIONS)).max(12).optional().default([]),
  breeder_response_hours: responseHoursSchema,
});

export const warrantyPolicyBodySchema = warrantyPolicyFieldsSchema.strict();

const supportEvidenceSchema = httpUrlListSchema(SUPPORT_SCAM_MAX_EVIDENCE);

export const supportTicketBodySchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("feedback"),
      category: z.enum(FEEDBACK_CATEGORIES),
      title: trimmedString(1, 160),
      body: trimmedString(1, 4000),
      evidence_urls: supportEvidenceSchema.max(SUPPORT_FEEDBACK_MAX_EVIDENCE).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("scam"),
      scam_target_type: z.enum(SCAM_TARGET_TYPES),
      identifier: trimmedString(1, 200),
      related_url: httpUrlSchema.optional(),
      body: trimmedString(1, 4000),
      anonymous: z.boolean().optional(),
      evidence_confirmed: z.literal(true),
      evidence_urls: supportEvidenceSchema.min(1),
    })
    .strict(),
]);

export const dealReviewBodySchema = z
  .object({
    rating: z.coerce.number().int().min(1).max(5),
    body: z.string().trim().max(REVIEW_COMMENT_MAX).optional(),
    comment: z.string().trim().max(REVIEW_COMMENT_MAX).optional(),
  })
  .strict()
  .transform(({ rating, body, comment }) => ({
    rating,
    ...(body || comment ? { body: (body || comment || "").trim() } : {}),
  }));

export const sendMessageBodySchema = z
  .object({
    body: z.string().trim().max(MESSAGE_BODY_MAX).optional().default(""),
    media_urls: z.array(z.string().trim().max(1000)).max(MESSAGE_MEDIA_MAX).optional(),
    mediaUrls: z.array(z.string().trim().max(1000)).max(MESSAGE_MEDIA_MAX).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const media = value.media_urls ?? value.mediaUrls ?? [];
    const urls = media
      .map((item) => item.trim())
      .filter((item) => /^https?:\/\//i.test(item));
    const text = value.body ?? "";
    if (!text && urls.length < 1) {
      ctx.addIssue({
        code: "custom",
        message: "Message body or at least one media URL is required",
        path: ["body"],
      });
    }
  })
  .transform((value) => {
    const media = value.media_urls ?? value.mediaUrls ?? [];
    const urls = media
      .map((item) => item.trim())
      .filter((item) => /^https?:\/\//i.test(item));
    return { body: value.body ?? "", mediaUrls: urls };
  });

export const postCommentBodySchema = z
  .object({
    body: z.string().trim().max(COMMENT_BODY_MAX).optional(),
    text: z.string().trim().max(COMMENT_BODY_MAX).optional(),
    parentId: z.string().trim().max(80).optional(),
    parent_id: z.string().trim().max(80).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const text = (value.body ?? value.text ?? "").trim();
    if (!text) {
      ctx.addIssue({
        code: "custom",
        message: "Comment body is required",
        path: ["body"],
      });
    }
  })
  .transform((value) => {
    const text = (value.body ?? value.text ?? "").trim();
    const parentId = (value.parentId ?? value.parent_id ?? "").trim() || null;
    return { body: text, parentId };
  });

export const markNotificationsReadBodySchema = z
  .object({
    ids: z.array(z.string().trim().min(1).max(80)).max(MARK_NOTIFICATIONS_READ_MAX).optional(),
  })
  .strict();

export const depositConfirmBodySchema = z
  .object({
    senUserId: z.string().trim().max(80).optional(),
    sen_user_id: z.string().trim().max(80).optional(),
    acknowledge: z.boolean().optional(),
    acknowledged: z.boolean().optional(),
  })
  .strict()
  .transform((value) => ({
    senUserId: value.senUserId ?? value.sen_user_id,
    acknowledge: Boolean(value.acknowledge ?? value.acknowledged),
  }));

export const dealPhotoUrlsBodySchema = z
  .object({
    handoffPhotoUrls: httpUrlListSchema(DEAL_PHOTO_URLS_MAX).optional(),
    handoff_photo_urls: httpUrlListSchema(DEAL_PHOTO_URLS_MAX).optional(),
    cancelPhotoUrls: httpUrlListSchema(DEAL_PHOTO_URLS_MAX).optional(),
    cancel_photo_urls: httpUrlListSchema(DEAL_PHOTO_URLS_MAX).optional(),
    disputePhotoUrls: httpUrlListSchema(DEAL_PHOTO_URLS_MAX).optional(),
    dispute_photo_urls: httpUrlListSchema(DEAL_PHOTO_URLS_MAX).optional(),
  })
  .strict();

export const dealCancelBodySchema = z
  .object({
    reason: trimmedString(1, CANCEL_DEPOSIT_REASON_MAX),
    cancelPhotoUrls: httpUrlListSchema(DEAL_PHOTO_URLS_MAX).optional(),
    cancel_photo_urls: httpUrlListSchema(DEAL_PHOTO_URLS_MAX).optional(),
  })
  .strict()
  .transform((value) => ({
    reason: value.reason,
    cancelPhotoUrls: value.cancelPhotoUrls ?? value.cancel_photo_urls ?? [],
  }));

export const dealDisputeBodySchema = z
  .object({
    message: z.string().trim().max(DEAL_DISPUTE_MESSAGE_MAX).optional(),
    note: z.string().trim().max(DEAL_DISPUTE_MESSAGE_MAX).optional(),
    disputePhotoUrls: httpUrlListSchema(DEAL_PHOTO_URLS_MAX).min(1),
    dispute_photo_urls: httpUrlListSchema(DEAL_PHOTO_URLS_MAX).min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const message = (value.message ?? value.note ?? "").trim();
    if (!message) {
      ctx.addIssue({
        code: "custom",
        message: "Dispute message is required",
        path: ["message"],
      });
    }
  })
  .transform((value) => ({
    message: (value.message ?? value.note ?? "").trim(),
    disputePhotoUrls: value.disputePhotoUrls ?? value.dispute_photo_urls ?? [],
  }));

export const completeRequestBodySchema = z
  .object({
    handoffPhotoUrls: httpUrlListSchema(DEAL_PHOTO_URLS_MAX).min(1),
    handoff_photo_urls: httpUrlListSchema(DEAL_PHOTO_URLS_MAX).min(1).optional(),
  })
  .strict()
  .transform((value) => ({
    handoffPhotoUrls: value.handoffPhotoUrls ?? value.handoff_photo_urls ?? [],
  }));

export const warrantyPolicyIdParamSchema = z.string().trim().min(1).max(80);

export const listingWarrantyBindBodySchema = z
  .object({
    warrantyPolicyId: z.union([z.string().trim().max(80), z.null()]).optional(),
    warranty_policy_id: z.union([z.string().trim().max(80), z.null()]).optional(),
  })
  .strict()
  .transform((value) => value.warrantyPolicyId ?? value.warranty_policy_id ?? null);
