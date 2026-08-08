import type { Metadata } from "next";
import { Suspense } from "react";
import { Fraunces, Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { HeaderWithSession } from "@/components/HeaderWithSession";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { getLang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { SHARE_ORIGIN } from "@/lib/config";
import { BRAND_AVATAR_PATH } from "@/lib/brand";

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
  metadataBase: new URL(SHARE_ORIGIN),
  title: {
    default: "Pet Marketplace",
    template: "%s · Pet Marketplace",
  },
  description:
    "Find healthy pets from trusted breeders — clear profiles, vaccine records, and safer in-app contact.",
  icons: {
    icon: [{ url: BRAND_AVATAR_PATH, type: "image/png" }],
    apple: [{ url: BRAND_AVATAR_PATH, type: "image/png" }],
    shortcut: BRAND_AVATAR_PATH,
  },
  openGraph: {
    type: "website",
    siteName: "Pet Marketplace",
    locale: "vi_VN",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });

  return (
    <html lang={lang === "VI" ? "vi" : "en"}>
      <body
        className={`${inter.variable} ${fraunces.variable} font-sans antialiased bg-[#FDFBF7] text-stone-900`}
      >
        <Suspense
          fallback={
            <SiteHeader
              lang={lang}
              isAdmin={false}
              isLoggedIn={false}
              unreadNotificationCount={0}
            />
          }
        >
          <HeaderWithSession lang={lang} />
        </Suspense>
        <Suspense fallback={null}>
          <SiteBreadcrumbs lang={lang} />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
