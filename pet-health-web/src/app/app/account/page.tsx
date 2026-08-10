import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import {
  listFavorites,
  listMyDeposits,
  listMyPosts,
  getMyBreederProfile,
} from "@/lib/api/petFeed";
import {
  AccountPanel,
  type AccountListingItem,
  type AccountBreederInfo,
} from "@/components/account/AccountPanel";
import { AccountDataSkeleton } from "@/components/ui/Skeleton";
import { mapApiPost } from "@/lib/mappers";
import type { ApiPetFeedPost, Lang } from "@/lib/types";

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
    listing: mapApiPost(post),
  };
}

async function AccountData({
  lang,
  token,
  displayName,
  email,
  role,
  isAdmin,
}: {
  lang: Lang;
  token: string;
  displayName?: string;
  email?: string;
  role: string;
  isAdmin: boolean;
}) {
  let savedCount = 0;
  let myListings: AccountListingItem[] = [];
  let depositedListings: AccountListingItem[] = [];
  let breeder: AccountBreederInfo | null = null;

  try {
    const [favs, mine, deposits, profile] = await Promise.all([
      listFavorites(token).catch(() => ({ data: [] })),
      listMyPosts(token).catch(() => ({ data: [] })),
      listMyDeposits(token).catch(() => ({ data: [] })),
      getMyBreederProfile(token).catch(() => ({ data: null })),
    ]);

    savedCount = extractPosts(favs).length;
    myListings = extractPosts(mine).map(toListingItem);
    depositedListings = extractPosts(deposits).map(toListingItem);

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

  return (
    <AccountPanel
      lang={lang}
      displayName={displayName}
      email={email}
      role={role}
      isAdmin={isAdmin}
      savedCount={savedCount}
      myListings={myListings}
      depositedListings={depositedListings}
      breeder={breeder}
    />
  );
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

  const role = (session.account?.primary_role || "sen").toLowerCase();

  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-5 lg:px-8 py-10">
          <div className="mb-6 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-[#F0E6D8]" />
            <div className="h-8 w-40 animate-pulse rounded bg-[#F0E6D8]" />
          </div>
          <AccountDataSkeleton />
        </div>
      }
    >
      <AccountData
        lang={lang}
        token={session.token}
        displayName={session.account?.display_name}
        email={session.account?.email}
        role={role}
        isAdmin={session.isAdmin}
      />
    </Suspense>
  );
}
