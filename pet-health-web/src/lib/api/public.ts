import { unstable_cache } from "next/cache";
import { fetchJson } from "./client";
import type { ApiBreederProfile, ApiPetFeedPost, PageResult } from "../types";
import { mapApiBreeder, mapApiPost, mapApiPosts } from "../mappers";
import { countFarmPetsByAvailability } from "../farmPets";
import type { BreederProfile, Listing } from "../types";

const PUBLIC_LIST_REVALIDATE = 30;
const PUBLIC_DETAIL_REVALIDATE = 60;

export async function listPublicPosts(options?: {
  limit?: number;
  cursor?: string | null;
  kind?: string;
}): Promise<{ listings: Listing[]; nextCursor: string | null }> {
  const limit = options?.limit ?? 0;
  const cursor = options?.cursor || "";
  const kind = options?.kind || "";

  return unstable_cache(
    async () => {
      const params = new URLSearchParams();
      if (limit) params.set("limit", String(limit));
      if (cursor) params.set("cursor", cursor);
      if (kind) params.set("kind", kind);
      const qs = params.toString();
      const page = await fetchJson<PageResult<ApiPetFeedPost>>(
        `/public/pet-feed/posts${qs ? `?${qs}` : ""}`,
        { next: { revalidate: PUBLIC_LIST_REVALIDATE }, timeoutMs: 25_000 },
      );
      return {
        listings: mapApiPosts(page.data || []),
        nextCursor: page.nextCursor ?? null,
      };
    },
    ["public-posts", String(limit), cursor, kind],
    { revalidate: PUBLIC_LIST_REVALIDATE, tags: ["public-posts"] },
  )();
}

export async function getPublicPostDetail(postId: string): Promise<Listing | null> {
  try {
    return await unstable_cache(
      async () => {
        const res = await fetchJson<{ data: ApiPetFeedPost }>(
          `/public/pet-feed/posts/${encodeURIComponent(postId)}/detail`,
          { next: { revalidate: PUBLIC_DETAIL_REVALIDATE } },
        );
        if (!res?.data) return null;
        return mapApiPost(res.data);
      },
      ["public-post-detail", postId],
      { revalidate: PUBLIC_DETAIL_REVALIDATE, tags: ["public-posts", postId] },
    )();
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404) return null;
    throw err;
  }
}

export type PublicComment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  author_display_name: string;
  created_at: string;
};

export async function listPublicPostComments(
  postId: string,
): Promise<PublicComment[]> {
  try {
    return await unstable_cache(
      async () => {
        const res = await fetchJson<{ data: PublicComment[] }>(
          `/public/pet-feed/posts/${encodeURIComponent(postId)}/comments`,
          { next: { revalidate: PUBLIC_LIST_REVALIDATE } },
        );
        return Array.isArray(res?.data) ? res.data : [];
      },
      ["public-post-comments", postId],
      { revalidate: PUBLIC_LIST_REVALIDATE, tags: ["public-posts", postId] },
    )();
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404) return [];
    throw err;
  }
}

export async function listPublicBreeders(options?: {
  limit?: number;
}): Promise<BreederProfile[]> {
  const limit = options?.limit ?? 0;

  return unstable_cache(
    async () => {
      const params = new URLSearchParams();
      if (limit) params.set("limit", String(limit));
      const qs = params.toString();
      const page = await fetchJson<PageResult<ApiBreederProfile>>(
        `/public/pet-feed/breeders${qs ? `?${qs}` : ""}`,
        { next: { revalidate: PUBLIC_LIST_REVALIDATE }, timeoutMs: 25_000 },
      );
      return (page.data || []).map((p) => mapApiBreeder(p));
    },
    ["public-breeders", String(limit)],
    { revalidate: PUBLIC_LIST_REVALIDATE, tags: ["public-breeders"] },
  )();
}

export async function getPublicBreeder(
  profileId: string,
): Promise<{ profile: BreederProfile; listings: Listing[] } | null> {
  try {
    return await unstable_cache(
      async () => {
        const res = await fetchJson<{
          data: { profile: ApiBreederProfile; listings: ApiPetFeedPost[] };
        }>(`/public/pet-feed/breeders/${encodeURIComponent(profileId)}`, {
          next: { revalidate: PUBLIC_DETAIL_REVALIDATE },
        });
        if (!res?.data?.profile) return null;
        const listings = mapApiPosts(res.data.listings || []);
        const farmCounts = countFarmPetsByAvailability(listings);
        return {
          profile: mapApiBreeder(res.data.profile, {
            activeListings: farmCounts.for_sale,
            petsRehomed: farmCounts.completed,
          }),
          listings,
        };
      },
      ["public-breeder", profileId],
      {
        revalidate: PUBLIC_DETAIL_REVALIDATE,
        tags: ["public-breeders", profileId],
      },
    )();
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404) return null;
    throw err;
  }
}
