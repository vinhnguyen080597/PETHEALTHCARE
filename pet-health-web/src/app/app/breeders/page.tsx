import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { listPublicBreeders } from "@/lib/api/public";
import { BreederDirectoryCard } from "@/components/marketplace/BreederDirectoryCard";

export const metadata = { title: "Breeders" };

export default async function BreedersPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  let breeders: Awaited<ReturnType<typeof listPublicBreeders>> = [];
  try {
    breeders = await listPublicBreeders({ limit: 48 });
  } catch {
    // offline
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-8">
        <h1 className="font-display text-2xl lg:text-3xl font-semibold text-[#2B1E19] mb-2 tracking-tight">
          {t(lang, "breeders.title")}
        </h1>
        <p className="text-sm text-[#6E5A51] mb-7">
          {t(lang, "breeders.subtitle")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {breeders.map((b) => (
            <BreederDirectoryCard key={b.id} breeder={b} lang={lang} />
          ))}
        </div>
        {breeders.length === 0 && (
          <p className="text-center text-[#6E5A51] py-16">
            {t(lang, "breeders.empty")}
          </p>
        )}
      </div>
    </div>
  );
}
