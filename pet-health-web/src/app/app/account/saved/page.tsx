import Link from "next/link";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { listFavorites } from "@/lib/api/petFeed";
import { mapApiPosts } from "@/lib/mappers";
import { ListingCard } from "@/components/marketplace/ListingCard";
import type { ApiPetFeedPost } from "@/lib/types";

export const metadata = { title: "Saved" };

export default async function SavedListingsPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  const session = await getSessionUser();

  if (!session.isLoggedIn || !session.token) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center">
        <p className="text-[#5C4A3A] mb-4">{t(lang, "account.notLoggedIn")}</p>
        <Link
          href="/login?next=/app/account/saved"
          className="inline-block px-6 py-2.5 bg-[#D97706] text-white text-sm font-semibold rounded-full"
        >
          {t(lang, "auth.login")}
        </Link>
      </div>
    );
  }

  let listings: ReturnType<typeof mapApiPosts> = [];
  try {
    const res = await listFavorites(session.token);
    const data = Array.isArray(res.data) ? (res.data as ApiPetFeedPost[]) : [];
    listings = mapApiPosts(data);
  } catch {
    listings = [];
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-8">
        <Link
          href="/app/account"
          className="text-sm text-[#D97706] font-medium hover:text-[#B45309]"
        >
          ← {t(lang, "account.title")}
        </Link>
        <h1 className="mt-4 font-display text-2xl lg:text-3xl font-semibold text-[#2B1E19] tracking-tight">
          {t(lang, "account.savedPage.title")}
        </h1>
        <p className="mt-1 text-sm text-[#6E5A51] mb-7">
          {t(lang, "account.savedPage.subtitle")}
        </p>
        {listings.length === 0 ? (
          <div className="rounded-2xl border border-[#F0E6D8] bg-white px-5 py-12 text-center">
            <p className="text-sm text-[#6E5A51] mb-4">
              {t(lang, "account.savedPage.empty")}
            </p>
            <Link
              href="/app/pet-feed"
              className="inline-block px-5 py-2.5 rounded-full bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309]"
            >
              {t(lang, "account.senIntro.petFeedCta")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} lang={lang} showFavorite />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
