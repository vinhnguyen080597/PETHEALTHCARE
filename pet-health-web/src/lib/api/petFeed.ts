import { fetchJson, fetchMultipart } from "./client";
import type { ApiBreederProfile, ApiPetFeedPost, PageResult } from "../types";

export async function listMyPosts(token: string) {
  return fetchJson<PageResult<ApiPetFeedPost> | { data: ApiPetFeedPost[] }>(
    "/pet-feed/my-posts",
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
) {
  return fetchJson(`/pet-feed/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    token,
    body: { body },
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
) {
  return fetchJson(
    `/pet-feed/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      token,
      body: { body },
    },
  );
}

export async function startConversation(token: string, postId: string) {
  return fetchJson(
    `/pet-feed/posts/${encodeURIComponent(postId)}/conversations`,
    {
      method: "POST",
      token,
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
) {
  return fetchJson(`/admin/breeder-profiles/${encodeURIComponent(userId)}/status`, {
    method: "PUT",
    token,
    body: { status },
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

export async function adminListFeatureFlags(token: string) {
  return fetchJson<{ data: unknown[] }>("/admin/feature-flags", {
    token,
    cache: "no-store",
  });
}
