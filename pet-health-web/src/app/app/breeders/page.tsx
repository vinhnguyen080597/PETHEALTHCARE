import { Suspense } from "react";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { listPublicBreeders } from "@/lib/api/public";
import { BreederDirectoryView } from "@/components/marketplace/BreederDirectoryView";
import { BreederGridSkeleton } from "@/components/ui/Skeleton";
import type { Lang } from "@/lib/types";

export const metadata = { title: "Top Breeders" };

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
    <BreederDirectoryView
      breeders={breeders}
      lang={lang}
      loadError={loadError}
    />
  );
}

function BreedersHeaderSkeleton({ lang }: { lang: Lang }) {
  return (
    <>
      <h1 className="font-display text-2xl lg:text-3xl font-semibold text-[#2B1E19] mb-2 tracking-tight">
        {t(lang, "breeders.title")}
      </h1>
      <p className="text-sm text-[#6E5A51] mb-7">
        {t(lang, "breeders.subtitle")}
      </p>
      <BreederGridSkeleton count={6} />
    </>
  );
}

export default async function BreedersPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-8">
        <Suspense fallback={<BreedersHeaderSkeleton lang={lang} />}>
          <BreedersGrid lang={lang} />
        </Suspense>
      </div>
    </div>
  );
}
