import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { ResourceNotFound } from "@/components/ResourceNotFound";

export default async function GlobalNotFound() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });

  return (
    <ResourceNotFound
      lang={lang}
      titleKey="notFound.title"
      bodyKey="notFound.body"
      primaryHref="/"
      primaryLabelKey="breadcrumb.home"
      secondaryHref="/app/pet-feed"
      secondaryLabelKey="nav.browse"
    />
  );
}
