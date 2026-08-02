import { fetchJson } from "./client";
import type { ApiBreederProfile, ApiPetFeedPost, PageResult } from "../types";
import { mapApiBreeder, mapApiPost, mapApiPosts } from "../mappers";
import type { BreederProfile, Listing } from "../types";

export async function listPublicPosts(options?: {
  limit?: number;
  cursor?: string | null;
  kind?: string;
}): Promise<{ listings: Listing[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.cursor) params.set("cursor", options.cursor);
  if (options?.kind) params.set("kind", options.kind);
  const qs = params.toString();
  const page = await fetchJson<PageResult<ApiPetFeedPost>>(
    `/public/pet-feed/posts${qs ? `?${qs}` : ""}`,
    { next: { revalidate: 60 } },
  );
  return {
    listings: mapApiPosts(page.data || []),
    nextCursor: page.nextCursor ?? null,
  };
}

export async function getPublicPostDetail(postId: string): Promise<Listing | null> {
  try {
    const res = await fetchJson<{ data: ApiPetFeedPost }>(
      `/public/pet-feed/posts/${encodeURIComponent(postId)}/detail`,
      { next: { revalidate: 60 } },
    );
    if (!res?.data) return null;
    return mapApiPost(res.data);
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404) return null;
    throw err;
  }
}

export async function listPublicBreeders(options?: {
  limit?: number;
}): Promise<BreederProfile[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  const qs = params.toString();
  const page = await fetchJson<PageResult<ApiBreederProfile>>(
    `/public/pet-feed/breeders${qs ? `?${qs}` : ""}`,
    { next: { revalidate: 60 } },
  );
  return (page.data || []).map((p) => mapApiBreeder(p));
}

export async function getPublicBreeder(
  profileId: string,
): Promise<{ profile: BreederProfile; listings: Listing[] } | null> {
  try {
    const res = await fetchJson<{
      data: { profile: ApiBreederProfile; listings: ApiPetFeedPost[] };
    }>(`/public/pet-feed/breeders/${encodeURIComponent(profileId)}`, {
      next: { revalidate: 60 },
    });
    if (!res?.data?.profile) return null;
    const listings = mapApiPosts(res.data.listings || []);
    return {
      profile: mapApiBreeder(res.data.profile, {
        activeListings: listings.length,
      }),
      listings,
    };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404) return null;
    throw err;
  }
}
