import en, { type EnKey } from "./en";
import vi from "./vi";
import type { Lang } from "../lib/types";

export type { Lang, EnKey };

function parseLang(value: string | null | undefined): Lang {
  return (value || "").toUpperCase() === "EN" ? "EN" : "VI";
}

function langFromAcceptLanguage(header?: string | null): Lang | null {
  const first = String(header || "")
    .split(",")[0]
    ?.trim()
    .toLowerCase();
  if (!first) return null;
  if (first.startsWith("en")) return "EN";
  if (first.startsWith("vi")) return "VI";
  return null;
}

export function getLang(input?: {
  cookie?: string | null;
  searchParams?: { lang?: string | string[] | undefined } | null;
  acceptLanguage?: string | null;
}): Lang {
  const sp = input?.searchParams?.lang;
  const fromQuery = Array.isArray(sp) ? sp[0] : sp;
  if (fromQuery) return parseLang(fromQuery);
  if (input?.cookie) return parseLang(input.cookie);
  return langFromAcceptLanguage(input?.acceptLanguage) || "VI";
}

export function t(lang: Lang, key: EnKey): string {
  const dict = lang === "EN" ? en : vi;
  return dict[key] ?? en[key] ?? key;
}

export function genderLabel(lang: Lang, gender: string): string {
  const g = gender.toLowerCase();
  if (g === "male") return t(lang, "common.male");
  if (g === "female") return t(lang, "common.female");
  return gender;
}
