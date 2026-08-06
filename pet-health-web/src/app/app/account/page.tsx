import Link from "next/link";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import {
  listFavorites,
  listMyPosts,
  getMyBreederProfile,
  adminListPosts,
  adminListBreeders,
} from "@/lib/api/petFeed";
import {
  AccountPanel,
  type AccountListingItem,
  type AccountBreederInfo,
} from "@/components/account/AccountPanel";
import type { ApiPetFeedPost } from "@/lib/types";

export const metadata = { title: "Account" };

function extractPosts(raw: unknown): ApiPetFeedPost[] {
  if (!raw || typeof raw !== "object") return [];
  const data = (raw as { data?: unknown }).data;
  return Array.isArray(data) ? (data as ApiPetFeedPost[]) : [];
}

function listingThumb(post: ApiPetFeedPost): string | null {
  const meta = post.metadata;
  if (meta && typeof meta === "object") {
    const thumb = (meta as { list_thumb_url?: unknown }).list_thumb_url;
    if (typeof thumb === "string" && thumb.trim()) return thumb.trim();
  }
  const first = post.media_urls?.[0];
  return typeof first === "string" && first ? first : null;
}

function toListingItem(post: ApiPetFeedPost): AccountListingItem {
  return {
    id: post.id,
    title: post.title || "",
    breed: post.breed,
    location: post.location,
    status: post.status || "draft",
    thumbUrl: listingThumb(post),
  };
}

export default async function AccountPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  const session = await getSessionUser();

  if (!session.isLoggedIn || !session.token) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center">
        <p className="text-[#5C4A3A] mb-4">{t(lang, "account.notLoggedIn")}</p>
        <Link
          href="/login?next=/app/account"
          className="inline-block px-6 py-2.5 bg-[#D97706] text-white text-sm font-semibold rounded-full"
        >
          {t(lang, "auth.login")}
        </Link>
      </div>
    );
  }

  const token = session.token;
  const role = (session.account?.primary_role || "sen").toLowerCase();

  let savedCount = 0;
  let myListings: AccountListingItem[] = [];
  let breeder: AccountBreederInfo | null = null;
  let adminMetrics:
    | {
        pendingRequests: number;
        activeBreeders: number;
        pendingListings: number;
      }
    | undefined;

  try {
    const [favs, mine, profile] = await Promise.all([
      listFavorites(token).catch(() => ({ data: [] })),
      listMyPosts(token).catch(() => ({ data: [] })),
      getMyBreederProfile(token).catch(() => ({ data: null })),
    ]);

    savedCount = extractPosts(favs).length;
    myListings = extractPosts(mine).map(toListingItem);

    const profileData =
      profile && typeof profile === "object" && "data" in profile
        ? profile.data
        : null;
    if (profileData?.id) {
      breeder = {
        id: profileData.id,
        displayName: profileData.display_name,
        location: profileData.location,
        primarySpecies: profileData.primary_species,
        verificationStatus: profileData.verification_status || "unverified",
      };
    }
  } catch {
    // keep defaults
  }

  if (session.isAdmin) {
    try {
      const [pendingPosts, pendingBreeders, verifiedBreeders] =
        await Promise.all([
          adminListPosts(token, "pending_review").catch(() => ({ data: [] })),
          adminListBreeders(token, "pending_review").catch(() => ({
            data: [],
          })),
          adminListBreeders(token, "verified").catch(() => ({ data: [] })),
        ]);
      const pendingListings = Array.isArray(pendingPosts.data)
        ? pendingPosts.data.length
        : 0;
      const pendingBreederCount = Array.isArray(pendingBreeders.data)
        ? pendingBreeders.data.length
        : 0;
      const activeBreeders = Array.isArray(verifiedBreeders.data)
        ? verifiedBreeders.data.length
        : 0;
      adminMetrics = {
        pendingRequests: pendingBreederCount + pendingListings,
        activeBreeders,
        pendingListings,
      };
    } catch {
      adminMetrics = {
        pendingRequests: 0,
        activeBreeders: 0,
        pendingListings: 0,
      };
    }
  }

  return (
    <AccountPanel
      lang={lang}
      displayName={session.account?.display_name}
      email={session.account?.email}
      role={role}
      isAdmin={session.isAdmin}
      savedCount={savedCount}
      myListings={myListings}
      breeder={breeder}
      adminMetrics={adminMetrics}
    />
  );
}
