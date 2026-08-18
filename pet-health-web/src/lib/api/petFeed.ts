import { fetchJson, fetchMultipart } from "./client";
import { UPLOAD_TIMEOUT_MS } from "../config";
import type { ApiBreederProfile, ApiPetFeedPost, ApiWarrantyPolicy, PageResult } from "../types";

export async function listMyPosts(token: string) {
  return fetchJson<PageResult<ApiPetFeedPost> | { data: ApiPetFeedPost[] }>(
    "/pet-feed/my-posts",
    { token, cache: "no-store" },
  );
}

/** Soft-deposit listings where the current user is Sen (buyer). */
export async function listMyDeposits(token: string) {
  return fetchJson<PageResult<ApiPetFeedPost> | { data: ApiPetFeedPost[] }>(
    "/pet-feed/my-deposits",
    { token, cache: "no-store" },
  );
}

export async function listFavorites(token: string) {
  return fetchJson<PageResult<ApiPetFeedPost> | { data: ApiPetFeedPost[] }>(
    "/pet-feed/favorites",
    { token, cache: "no-store" },
  );
}

export async function favoritePost(token: string, postId: string) {
  return fetchJson(`/pet-feed/posts/${encodeURIComponent(postId)}/favorite`, {
    method: "POST",
    token,
  });
}

export async function unfavoritePost(token: string, postId: string) {
  return fetchJson(`/pet-feed/posts/${encodeURIComponent(postId)}/favorite`, {
    method: "DELETE",
    token,
  });
}

export async function getPostFavoriteStatus(token: string, postId: string) {
  return fetchJson<{ data: { favorited: boolean } }>(
    `/pet-feed/posts/${encodeURIComponent(postId)}/favorite`,
    { token, cache: "no-store" },
  );
}

/** Authenticated feed page (includes `is_favorited` for the current user). */
export async function listFeedPosts(
  token: string,
  options?: { limit?: number; cursor?: string | null; kind?: string },
) {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.cursor) params.set("cursor", String(options.cursor));
  if (options?.kind) params.set("kind", String(options.kind));
  const qs = params.toString();
  return fetchJson<PageResult<ApiPetFeedPost>>(
    `/pet-feed/posts${qs ? `?${qs}` : ""}`,
    { token, cache: "no-store" },
  );
}

export async function listComments(token: string | null, postId: string) {
  return fetchJson<{ data: unknown[] }>(
    `/pet-feed/posts/${encodeURIComponent(postId)}/comments`,
    { token, cache: "no-store" },
  );
}

export async function createComment(
  token: string,
  postId: string,
  body: string,
  parentId?: string | null,
) {
  const payload: { body: string; parentId?: string } = { body };
  const parent = String(parentId || "").trim();
  if (parent) payload.parentId = parent;
  return fetchJson(`/pet-feed/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    token,
    body: payload,
  });
}

export async function listConversations(token: string) {
  return fetchJson<{ data: unknown[] }>("/pet-feed/conversations", {
    token,
    cache: "no-store",
  });
}

export async function getConversation(token: string, conversationId: string) {
  return fetchJson<{ data: unknown }>(
    `/pet-feed/conversations/${encodeURIComponent(conversationId)}`,
    { token, cache: "no-store" },
  );
}

export async function listMessages(token: string, conversationId: string) {
  return fetchJson<{ data: unknown[] }>(
    `/pet-feed/conversations/${encodeURIComponent(conversationId)}/messages`,
    { token, cache: "no-store" },
  );
}

export async function sendMessage(
  token: string,
  conversationId: string,
  body: string,
  mediaUrls: string[] = [],
) {
  return fetchJson(
    `/pet-feed/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      token,
      body: { body, media_urls: mediaUrls },
    },
  );
}

export async function uploadChatMedia(token: string, formData: FormData) {
  return fetchJson<{ data: { publicUrl: string; kind: string } }>(
    "/pet-feed/uploads/chat-media",
    {
      method: "POST",
      token,
      formData,
      timeoutMs: UPLOAD_TIMEOUT_MS,
    },
  );
}

export async function startConversation(token: string, postId: string) {
  return fetchJson<{ data: { id: string } }>(
    `/pet-feed/posts/${encodeURIComponent(postId)}/conversations`,
    {
      method: "POST",
      token,
    },
  );
}

export async function startBreederConversation(token: string, profileId: string) {
  return fetchJson<{ data: { id: string } }>(
    `/pet-feed/breeders/${encodeURIComponent(profileId)}/conversations`,
    {
      method: "POST",
      token,
    },
  );
}

export async function reportPost(
  token: string,
  postId: string,
  payload: { reason: string; note?: string },
) {
  return fetchJson(`/pet-feed/posts/${encodeURIComponent(postId)}/report`, {
    method: "POST",
    token,
    body: payload,
  });
}

export async function reportBreeder(
  token: string,
  profileId: string,
  payload: { reason: string; note?: string },
) {
  return fetchJson(
    `/pet-feed/breeders/${encodeURIComponent(profileId)}/report`,
    {
      method: "POST",
      token,
      body: payload,
    },
  );
}

export async function getUnreadNotificationCount(token: string) {
  return fetchJson<{ data: { unread_count: number } }>(
    "/pet-feed/notifications/unread-count",
    { token, cache: "no-store" },
  );
}

export type PetFeedNotification = {
  id: string;
  post_id?: string | null;
  comment_id?: string | null;
  breeder_profile_id?: string | null;
  type?: "post_comment" | "breeder_verified" | "breeder_rejected" | string;
  body_preview?: string;
  created_at?: string;
  read_at?: string | null;
  is_unread?: boolean;
  actor_display_name?: string;
  post_title?: string;
  post_thumb_url?: string | null;
  breeder_display_name?: string;
  cta_label?: string;
  rejection_reason?: string;
  admin_action?: string;
  admin_note?: string;
  metadata?: {
    cta_label?: string;
    cta_href?: string;
    rejection_reason?: string;
    admin_action?: string;
    admin_note?: string;
    report_id?: string;
    request_kind?: string;
    title?: string;
    thumb_url?: string | null;
  };
};

export async function listNotifications(token: string, limit = 50) {
  const qs = limit ? `?limit=${encodeURIComponent(String(limit))}` : "";
  return fetchJson<{ data: PetFeedNotification[]; unread_count: number }>(
    `/pet-feed/notifications${qs}`,
    { token, cache: "no-store" },
  );
}

export async function markNotificationsRead(token: string, ids?: string[]) {
  return fetchJson<{ data: { updated: number } }>(
    "/pet-feed/notifications/read",
    {
      method: "POST",
      token,
      body: ids?.length ? { ids } : {},
      cache: "no-store",
    },
  );
}

export async function createListingPost(token: string, formData: FormData) {
  return fetchMultipart<{ data: ApiPetFeedPost }>("/pet-feed/posts", formData, token);
}

export async function getMyBreederProfile(token: string) {
  return fetchJson<{ data: ApiBreederProfile | null }>(
    "/pet-feed/breeder-profile/me",
    { token, cache: "no-store" },
  );
}

export async function upsertMyBreederProfile(
  token: string,
  payload: Record<string, unknown>,
) {
  return fetchJson<{ data: ApiBreederProfile }>("/pet-feed/breeder-profile/me", {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function uploadBreederProfileImage(token: string, formData: FormData) {
  return fetchJson<{
    data: {
      publicUrl: string;
      kind: "avatar" | "cover";
      profile?: ApiBreederProfile;
    };
  }>("/pet-feed/breeder-profile/me/upload", {
    method: "POST",
    token,
    formData,
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
}

export async function updateMyBreederProfilePhotos(
  token: string,
  payload: { avatarUrl?: string; coverUrl?: string },
) {
  return fetchJson<{ data: ApiBreederProfile }>(
    "/pet-feed/breeder-profile/me/photos",
    {
      method: "PATCH",
      token,
      body: payload,
    },
  );
}

export async function getMyTransparencyWarning(token: string) {
  return fetchJson<{ data: import("../transparencyWarnings").TransparencyWarning | null }>(
    "/pet-feed/breeder-profile/me/transparency-warning",
    { token, cache: "no-store" },
  );
}

export async function confirmTransparencyWarning(token: string, warningId: string) {
  return fetchJson<{ data: import("../transparencyWarnings").TransparencyWarning }>(
    `/pet-feed/breeder-profile/me/transparency-warning/${encodeURIComponent(warningId)}/confirm`,
    { method: "POST", token },
  );
}

export async function appealTransparencyWarning(token: string, warningId: string) {
  return fetchJson<{ data: import("../transparencyWarnings").TransparencyWarning }>(
    `/pet-feed/breeder-profile/me/transparency-warning/${encodeURIComponent(warningId)}/appeal`,
    { method: "POST", token },
  );
}

export async function listMyBreederProfileSubmissions(token: string) {
  return fetchJson<{ data: import("../breederProfileSubmissions").BreederProfileSubmission[] }>(
    "/pet-feed/breeder-profile/me/submissions",
    { token, cache: "no-store" },
  );
}

export async function createBreederProfileSubmission(
  token: string,
  payload: { submissionType: string; url: string; note?: string },
) {
  return fetchJson<{ data: import("../breederProfileSubmissions").BreederProfileSubmission }>(
    "/pet-feed/breeder-profile/me/submissions",
    {
      method: "POST",
      token,
      body: payload,
    },
  );
}

export async function cancelBreederProfileSubmission(token: string, submissionId: string) {
  return fetchJson<{ data: import("../breederProfileSubmissions").BreederProfileSubmission }>(
    `/pet-feed/breeder-profile/me/submissions/${encodeURIComponent(submissionId)}/cancel`,
    { method: "POST", token },
  );
}

export async function uploadBreederTransparencyMedia(token: string, formData: FormData) {
  return fetchJson<{
    data: { publicUrl: string; kind: "facility_video" | "business_license" };
  }>("/pet-feed/breeder-profile/me/submissions/upload", {
    method: "POST",
    token,
    formData,
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
}

export async function adminListBreederSubmissions(token: string, status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return fetchJson<{ data: import("../breederProfileSubmissions").BreederProfileSubmission[] }>(
    `/admin/breeder-submissions${qs}`,
    { token, cache: "no-store" },
  );
}

export async function adminReviewBreederSubmission(
  token: string,
  submissionId: string,
  status: "approved" | "rejected",
  extras?: { rejectionReason?: string; adminNote?: string },
) {
  return fetchJson<{ data: import("../breederProfileSubmissions").BreederProfileSubmission }>(
    `/admin/breeder-submissions/${encodeURIComponent(submissionId)}/status`,
    {
      method: "PUT",
      token,
      body: {
        status,
        ...(extras?.rejectionReason ? { rejectionReason: extras.rejectionReason } : {}),
        ...(extras?.adminNote ? { adminNote: extras.adminNote } : {}),
      },
    },
  );
}

export async function listMyWarrantyPolicies(token: string) {
  return fetchJson<{
    data: Array<{
      id: string;
      title: string;
      file_url: string;
      content_type: string;
      created_at?: string;
    }>;
    meta?: { trust_awarded?: boolean };
  }>("/pet-feed/breeder-profile/me/warranty-policies", {
    token,
    cache: "no-store",
  });
}

export async function createWarrantyPolicy(
  token: string,
  payload: Record<string, unknown>,
) {
  return fetchJson<{
    data: ApiWarrantyPolicy;
    profile?: ApiBreederProfile;
    trust_awarded?: boolean;
  }>("/pet-feed/breeder-profile/me/warranty-policies", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function deleteWarrantyPolicy(token: string, policyId: string) {
  return fetchJson<{ data: ApiBreederProfile }>(
    `/pet-feed/breeder-profile/me/warranty-policies/${encodeURIComponent(policyId)}`,
    {
      method: "DELETE",
      token,
    },
  );
}

export async function updateWarrantyPolicy(
  token: string,
  policyId: string,
  payload: Record<string, unknown>,
) {
  return fetchJson<{
    data: ApiWarrantyPolicy;
    profile?: ApiBreederProfile;
  }>(
    `/pet-feed/breeder-profile/me/warranty-policies/${encodeURIComponent(policyId)}`,
    {
      method: "PATCH",
      token,
      body: payload,
    },
  );
}

export async function updateListingWarrantyPolicy(
  token: string,
  postId: string,
  warrantyPolicyId: string | null,
) {
  return fetchJson<{ data: ApiPetFeedPost }>(
    `/pet-feed/posts/${encodeURIComponent(postId)}/warranty-policy`,
    {
      method: "PUT",
      token,
      body: {
        warranty_policy_id: warrantyPolicyId,
      },
    },
  );
}

export async function updateMyListing(
  token: string,
  postId: string,
  payload: Record<string, unknown>,
) {
  return fetchJson<{ data: ApiPetFeedPost }>(
    `/pet-feed/posts/${encodeURIComponent(postId)}`,
    {
      method: "PUT",
      token,
      body: payload,
    },
  );
}

export async function getListingDetail(token: string, postId: string) {
  return fetchJson<{ data: ApiPetFeedPost }>(
    `/pet-feed/posts/${encodeURIComponent(postId)}`,
    { token, cache: "no-store" },
  );
}

export async function deleteMyListing(token: string, postId: string) {
  return fetchJson<{ data: ApiPetFeedPost }>(
    `/pet-feed/posts/${encodeURIComponent(postId)}`,
    {
      method: "DELETE",
      token,
    },
  );
}

export async function confirmListingDeposit(
  token: string,
  postId: string,
  payload: { senUserId?: string; acknowledge: boolean },
) {
  return fetchJson<{ data: ApiPetFeedPost; both_confirmed?: boolean }>(
    `/pet-feed/posts/${encodeURIComponent(postId)}/deposit/confirm`,
    {
      method: "POST",
      token,
      body: {
        senUserId: payload.senUserId,
        acknowledge: payload.acknowledge,
      },
    },
  );
}

export async function declineListingDeposit(token: string, postId: string) {
  return fetchJson<{ data: ApiPetFeedPost; declined_by?: string }>(
    `/pet-feed/posts/${encodeURIComponent(postId)}/deposit/decline`,
    {
      method: "POST",
      token,
    },
  );
}

export async function listSenUsers(
  token: string,
  options?: { search?: string; limit?: number },
) {
  const params = new URLSearchParams();
  if (options?.search) params.set("search", options.search);
  if (options?.limit) params.set("limit", String(options.limit));
  const qs = params.toString();
  return fetchJson<{
    data: Array<{ user_id: string; display_name: string; email: string }>;
  }>(`/pet-feed/sen-users${qs ? `?${qs}` : ""}`, {
    token,
    cache: "no-store",
  });
}

export async function uploadDealPhoto(token: string, formData: FormData) {
  return fetchJson<{ data: { publicUrl: string; kind: string } }>(
    "/pet-feed/uploads/deal-photo",
    {
      method: "POST",
      token,
      formData,
      timeoutMs: UPLOAD_TIMEOUT_MS,
    },
  );
}

export async function cancelListingDeposit(
  token: string,
  postId: string,
  payload: { reason: string; cancelPhotoUrls?: string[] },
) {
  return fetchJson<{ data: ApiPetFeedPost; pending_confirm?: boolean }>(
    `/pet-feed/posts/${encodeURIComponent(postId)}/deposit/cancel`,
    {
      method: "POST",
      token,
      body: payload,
    },
  );
}

export async function confirmListingCancelDeposit(token: string, postId: string) {
  return fetchJson<{ data: ApiPetFeedPost }>(
    `/pet-feed/posts/${encodeURIComponent(postId)}/deposit/cancel/confirm`,
    {
      method: "POST",
      token,
    },
  );
}

export async function requestListingComplete(
  token: string,
  postId: string,
  payload: { handoffPhotoUrls: string[] },
) {
  return fetchJson<{
    data: ApiPetFeedPost;
    both_confirmed?: boolean;
    complete_deadline_at?: string;
  }>(
    `/pet-feed/posts/${encodeURIComponent(postId)}/complete/request`,
    {
      method: "POST",
      token,
      body: payload,
    },
  );
}

export async function confirmListingComplete(token: string, postId: string) {
  return fetchJson<{
    data: ApiPetFeedPost;
    both_confirmed?: boolean;
    review_eligible?: boolean;
    breeder_profile_id?: string | null;
  }>(`/pet-feed/posts/${encodeURIComponent(postId)}/complete/confirm`, {
    method: "POST",
    token,
  });
}

/** Sen walks away after handoff request → listing republished; future escrow forfeits to breeder. */
export async function abandonListingHandoffBySen(token: string, postId: string) {
  return fetchJson<{
    data: ApiPetFeedPost;
    escrow_forfeit_to_breeder?: boolean;
  }>(`/pet-feed/posts/${encodeURIComponent(postId)}/complete/abandon`, {
    method: "POST",
    token,
  });
}

export async function getMyDealReview(token: string, postId: string) {
  return fetchJson<{ data: import("../breederDealReviews").BreederDealReview | null }>(
    `/pet-feed/posts/${encodeURIComponent(postId)}/review/me`,
    { token, cache: "no-store" },
  );
}

export async function submitDealReview(
  token: string,
  postId: string,
  payload: { rating: number; body?: string },
) {
  return fetchJson<{ data: import("../breederDealReviews").BreederDealReview }>(
    `/pet-feed/posts/${encodeURIComponent(postId)}/review`,
    { method: "POST", token, body: payload },
  );
}

export async function getBreederDealReviews(token: string | null, profileId: string) {
  return fetchJson<{ data: import("../breederDealReviews").BreederDealReviewAggregate }>(
    `/pet-feed/breeder-profiles/${encodeURIComponent(profileId)}/reviews`,
    { token, cache: "no-store" },
  );
}

export async function requestListingDispute(
  token: string,
  postId: string,
  payload: { message: string; disputePhotoUrls: string[] },
) {
  return fetchJson<{ data: ApiPetFeedPost; report?: unknown }>(
    `/pet-feed/posts/${encodeURIComponent(postId)}/complete/dispute`,
    {
      method: "POST",
      token,
      body: payload,
    },
  );
}

export async function adminForceCompleteListing(token: string, postId: string) {
  return fetchJson<{ data: ApiPetFeedPost }>(
    `/admin/pet-feed/posts/${encodeURIComponent(postId)}/deal/force-complete`,
    {
      method: "POST",
      token,
      body: {},
    },
  );
}

export async function adminForceCancelListing(token: string, postId: string) {
  return fetchJson<{ data: ApiPetFeedPost }>(
    `/admin/pet-feed/posts/${encodeURIComponent(postId)}/deal/force-cancel`,
    {
      method: "POST",
      token,
      body: {},
    },
  );
}

export async function cancelMyBreederVerificationRequest(token: string) {
  return fetchJson<{ data: ApiBreederProfile }>(
    "/pet-feed/breeder-profile/me/cancel",
    {
      method: "POST",
      token,
    },
  );
}

/** Admin helpers */
export async function adminListPosts(token: string, status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return fetchJson<{ data: ApiPetFeedPost[] }>(`/admin/pet-feed/posts${qs}`, {
    token,
    cache: "no-store",
  });
}

export async function adminUpdatePostStatus(
  token: string,
  postId: string,
  status: string,
) {
  return fetchJson(`/admin/pet-feed/posts/${encodeURIComponent(postId)}/status`, {
    method: "PUT",
    token,
    body: { status },
  });
}

export async function adminListBreeders(token: string, status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return fetchJson<{ data: ApiBreederProfile[] }>(`/admin/breeder-profiles${qs}`, {
    token,
    cache: "no-store",
  });
}

export async function adminUpdateBreederStatus(
  token: string,
  userId: string,
  status: string,
  extras?: {
    rejectionReason?: string;
    adminAction?: string;
    adminNote?: string;
  },
) {
  return fetchJson(`/admin/breeder-profiles/${encodeURIComponent(userId)}/status`, {
    method: "PUT",
    token,
    body: {
      verificationStatus: status,
      ...(extras?.rejectionReason ? { rejectionReason: extras.rejectionReason } : {}),
      ...(extras?.adminAction ? { adminAction: extras.adminAction } : {}),
      ...(extras?.adminNote ? { adminNote: extras.adminNote } : {}),
    },
  });
}

export async function adminListReports(token: string) {
  return fetchJson<{ data: unknown[] }>("/admin/pet-feed/reports", {
    token,
    cache: "no-store",
  });
}

export async function adminUpdateReportStatus(
  token: string,
  reportId: string,
  status: string,
) {
  return fetchJson(`/admin/pet-feed/reports/${encodeURIComponent(reportId)}/status`, {
    method: "PUT",
    token,
    body: { status },
  });
}

export async function adminListAccounts(token: string) {
  return fetchJson<{ data: unknown[] }>("/admin/accounts", {
    token,
    cache: "no-store",
  });
}

export async function getFeatureFlags(token: string) {
  return fetchJson<{ data: Record<string, boolean> }>("/feature-flags", {
    token,
    cache: "no-store",
  });
}

export async function adminListFeatureFlags(token: string) {
  return fetchJson<{ data: unknown[] }>("/admin/feature-flags", {
    token,
    cache: "no-store",
  });
}
