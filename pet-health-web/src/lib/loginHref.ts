/** Build /login?next=… (and optional /signup?next=…) for post-auth return. */
export function loginHref(nextPath: string): string {
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `/login?next=${encodeURIComponent(next)}`;
}

export function signupHref(nextPath?: string | null): string {
  if (!nextPath) return "/signup";
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `/signup?next=${encodeURIComponent(next)}`;
}

/** True when href is an in-app marketplace route that guests should auth for. */
export function isAppActionHref(href: string | null | undefined): boolean {
  if (!href) return false;
  try {
    if (href.startsWith("http://") || href.startsWith("https://")) {
      if (typeof window === "undefined") return false;
      const url = new URL(href);
      if (url.origin !== window.location.origin) return false;
      return url.pathname.startsWith("/app");
    }
  } catch {
    return false;
  }
  return href.startsWith("/app");
}
