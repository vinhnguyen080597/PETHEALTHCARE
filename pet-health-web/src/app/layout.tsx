import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { getLang } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { getUnreadNotificationCount } from "@/lib/api/petFeed";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pet Marketplace",
    template: "%s · Pet Marketplace",
  },
  description:
    "Structured pet marketplace — find breeder listings, compare info, contact safely.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  const session = await getSessionUser();
  let unreadCount = 0;
  if (session.token) {
    try {
      const unread = await getUnreadNotificationCount(session.token);
      unreadCount = Number(unread?.data?.unread_count) || 0;
    } catch {
      unreadCount = 0;
    }
  }

  return (
    <html lang={lang === "VI" ? "vi" : "en"}>
      <body className={`${inter.variable} font-sans antialiased bg-[#F2F4F8] text-slate-900`}>
        <SiteHeader
          lang={lang}
          isAdmin={session.isAdmin}
          isLoggedIn={session.isLoggedIn}
          unreadCount={unreadCount}
        />
        {children}
      </body>
    </html>
  );
}
