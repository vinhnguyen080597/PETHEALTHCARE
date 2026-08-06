import { Suspense } from "react";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { listPublicBreeders } from "@/lib/api/public";
import { BreederDirectoryCard } from "@/components/marketplace/BreederDirectoryCard";
import { BreederGridSkeleton } from "@/components/ui/Skeleton";
import type { Lang } from "@/lib/types";

export const metadata = { title: "Breeders" };

export const revalidate = 30;

async function BreedersGrid({ lang }: { lang: Lang }) {
  let breeders: Awaited<ReturnType<typeof listPublicBreeders>> = [];
  let loadError = "";
  try {
    breeders = await listPublicBreeders({ limit: 48 });
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : t(lang, "breeders.loadError");
  }

  return (
    <>
      {loadError ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-[#FEF3C7] px-4 py-3 text-sm text-[#92400E]">
          {t(lang, "breeders.loadError")}: {loadError}
        </div>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {breeders.map((b) => (
          <BreederDirectoryCard key={b.id} breeder={b} lang={lang} />
        ))}
      </div>
      {breeders.length === 0 && !loadError ? (
        <p className="text-center text-[#6E5A51] py-16">
          {t(lang, "breeders.empty")}
        </p>
      ) : null}
    </>
  );
}

export default async function BreedersPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-8">
        <h1 className="font-display text-2xl lg:text-3xl font-semibold text-[#2B1E19] mb-2 tracking-tight">
          {t(lang, "breeders.title")}
        </h1>
        <p className="text-sm text-[#6E5A51] mb-7">
          {t(lang, "breeders.subtitle")}
        </p>
        <Suspense fallback={<BreederGridSkeleton count={6} />}>
          <BreedersGrid lang={lang} />
        </Suspense>
      </div>
    </div>
  );
}
