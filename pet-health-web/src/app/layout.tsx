import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
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

const fraunces = Fraunces({
  subsets: ["latin", "vietnamese"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pet Marketplace",
    template: "%s · Pet Marketplace",
  },
  description:
    "Find healthy pets from trusted breeders — clear profiles, vaccine records, and safer in-app contact.",
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
      <body
        className={`${inter.variable} ${fraunces.variable} font-sans antialiased bg-[#FDFBF7] text-stone-900`}
      >
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
