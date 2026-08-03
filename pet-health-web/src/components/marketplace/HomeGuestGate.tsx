"use client";

import { useRouter } from "next/navigation";
import type { ReactNode, MouseEvent } from "react";
import { isAppActionHref, loginHref } from "@/lib/loginHref";

/**
 * On the marketing homepage, guests can browse teaser content but any
 * in-app action (/app/…) sends them to login/signup with a return URL.
 */
export function HomeGuestGate({
  isLoggedIn,
  children,
}: {
  isLoggedIn: boolean;
  children: ReactNode;
}) {
  const router = useRouter();

  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (isLoggedIn) return;
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!isAppActionHref(href)) return;
    e.preventDefault();
    e.stopPropagation();
    router.push(loginHref(href!));
  };

  return (
    <div onClickCapture={onClickCapture}>{children}</div>
  );
}
