import en, { type EnKey } from "./en";
import vi from "./vi";
import type { Lang } from "../lib/types";

export type { Lang, EnKey };

function parseLang(value: string | null | undefined): Lang {
  return (value || "").toUpperCase() === "EN" ? "EN" : "VI";
}

export function getLang(input?: {
  cookie?: string | null;
  searchParams?: { lang?: string | string[] | undefined } | null;
}): Lang {
  const sp = input?.searchParams?.lang;
  const fromQuery = Array.isArray(sp) ? sp[0] : sp;
  if (fromQuery) return parseLang(fromQuery);
  if (input?.cookie) return parseLang(input.cookie);
  return "VI";
}

export function t(lang: Lang, key: EnKey): string {
  if (lang === "EN") return en[key] ?? key;
  return vi[key] ?? en[key] ?? key;
}

export function genderLabel(lang: Lang, gender: string): string {
  const g = gender.toLowerCase();
  if (g === "male") return t(lang, "common.male");
  if (g === "female") return t(lang, "common.female");
  return gender;
}
