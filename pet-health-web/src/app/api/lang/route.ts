import { NextResponse } from "next/server";
import { COOKIE_LANG, langCookieOptions, parseLang } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const lang = parseLang(body.lang);
  const res = NextResponse.json({ lang });
  res.cookies.set(COOKIE_LANG, lang, langCookieOptions());
  return res;
}
