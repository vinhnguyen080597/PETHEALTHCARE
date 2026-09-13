import { cookies, headers } from "next/headers";
import { getLang, type Lang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";

export async function getLegalPageLang(searchParams?: {
  lang?: string | string[];
}): Promise<Lang> {
  const jar = await cookies();
  const hdrs = await headers();
  return getLang({
    cookie: jar.get(COOKIE_LANG)?.value,
    searchParams,
    acceptLanguage: hdrs.get("accept-language"),
  });
}
