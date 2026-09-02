const DEFAULT_SITE_ORIGIN = 'https://pet-marketplace.org';

const SITE_ORIGIN = (
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SITE_ORIGIN?.trim())
  || DEFAULT_SITE_ORIGIN
).replace(/\/+$/, '');

const SITE_PATH_PREFIX = (() => {
  try {
    return new URL(SITE_ORIGIN).pathname.replace(/\/+$/, '') || '';
  } catch {
    return '';
  }
})();

export type PetFeedDeepLink = {
  type: 'pet-feed-post';
  postId: string;
  saleReview?: boolean;
};

function parseSaleReviewQuery(value: string | null | undefined): boolean {
  const v = String(value ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function normalizePostId(value: string | null | undefined) {
  const id = String(value ?? '').trim();
  if (!id || id.length > 80) return '';
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return '';
  return id;
}

function stripSitePrefix(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (SITE_PATH_PREFIX && path.startsWith(SITE_PATH_PREFIX)) {
    return path.slice(SITE_PATH_PREFIX.length) || '/';
  }
  return path;
}

function postIdFromPathname(pathname: string) {
  const path = stripSitePrefix(pathname);
  // Custom domain: /app/pet-feed/posts/:id — legacy GitHub Pages: /PETHEALTHCARE/app/...
  const match = path.match(/\/(?:PETHEALTHCARE\/)?app\/pet-feed\/posts\/([^/]+)\/?$/i)
    || path.match(/^\/app\/pet-feed\/posts\/([^/]+)\/?$/i);
  return normalizePostId(match?.[1]);
}

/** HTTPS share URL (landing page + Universal / App Link target). */
export function petFeedPostShareUrl(postId: string) {
  const id = normalizePostId(postId);
  // Use the existing landing page (HTTP 200) so crawlers can read Open Graph tags.
  // Path form `/posts/:id/` remains supported for Universal Links + legacy shares.
  return `${SITE_ORIGIN}/app/pet-feed/post/?id=${encodeURIComponent(id)}`;
}

/** Canonical Universal Link path (also used as og:url when available). */
export function petFeedPostUniversalLinkUrl(postId: string) {
  const id = normalizePostId(postId);
  return `${SITE_ORIGIN}/app/pet-feed/posts/${encodeURIComponent(id)}/`;
}

/** Custom scheme used by the web landing page to open the installed app. */
export function petFeedPostAppSchemeUrl(postId: string) {
  const id = normalizePostId(postId);
  return `pethealthcare://pet-feed/posts/${encodeURIComponent(id)}`;
}

export function parsePetFeedDeepLink(url: string | null | undefined): PetFeedDeepLink | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    if (/^pethealthcare:/i.test(trimmed)) {
      const rest = trimmed.replace(/^pethealthcare:\/\//i, '').replace(/^pethealthcare:/i, '');
      const [pathPart, queryPart = ''] = rest.split('?');
      const path = `/${pathPart.replace(/^\/+/, '')}`;
      const fromPath = path.match(/pet-feed\/posts\/([^/]+)/i)?.[1];
      const params = new URLSearchParams(queryPart);
      const postId = normalizePostId(fromPath)
        || normalizePostId(params.get('id'))
        || normalizePostId(params.get('petFeedPost'));
      if (!postId) return null;
      const saleReview = parseSaleReviewQuery(params.get('saleReview'));
      return saleReview ? { type: 'pet-feed-post', postId, saleReview: true } : { type: 'pet-feed-post', postId };
    }

    const absolute = new URL(trimmed);
    const saleReview = parseSaleReviewQuery(absolute.searchParams.get('saleReview'));
    const fromPath = postIdFromPathname(absolute.pathname);
    if (fromPath) {
      return saleReview
        ? { type: 'pet-feed-post', postId: fromPath, saleReview: true }
        : { type: 'pet-feed-post', postId: fromPath };
    }
    const fromQuery = normalizePostId(absolute.searchParams.get('id') || absolute.searchParams.get('petFeedPost'));
    if (fromQuery) {
      return saleReview
        ? { type: 'pet-feed-post', postId: fromQuery, saleReview: true }
        : { type: 'pet-feed-post', postId: fromQuery };
    }
  } catch {
    return null;
  }
  return null;
}
