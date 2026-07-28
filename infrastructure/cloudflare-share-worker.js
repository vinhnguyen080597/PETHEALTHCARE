/**
 * Cloudflare Worker: rich Open Graph HTML for Pet Feed share links on pet-marketplace.org.
 *
 * Setup (Cloudflare Free):
 * 1. Add pet-marketplace.org to Cloudflare (proxy orange-cloud ON).
 * 2. Workers → Create → paste this script.
 * 3. Triggers → Add route: pet-marketplace.org/app/pet-feed/*
 * 4. Keep GitHub Pages as origin for other paths.
 *
 * For `/app/pet-feed/posts/:id` and `/app/pet-feed/post/?id=`, this worker returns SSR HTML
 * from the backend share endpoint so Zalo / Messenger / Facebook show title + image.
 */

const SHARE_API_ORIGIN = 'https://pet-health-backend-serb.onrender.com';

export default {
  async fetch(request, _env, _ctx) {
    const url = new URL(request.url);
    const postId = postIdFromRequest(url);
    if (!postId) {
      return fetch(request);
    }

    const shareUrl = `${SHARE_API_ORIGIN}/share/pet-feed/posts/${encodeURIComponent(postId)}`;
    const upstream = await fetch(shareUrl, {
      headers: {
        Accept: 'text/html',
        'User-Agent': request.headers.get('User-Agent') || 'PetMarketplaceShareWorker/1.0',
      },
    });

    const html = await upstream.text();
    return new Response(html, {
      status: upstream.status === 404 ? 404 : 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
      },
    });
  },
};

function postIdFromRequest(url) {
  const fromPath = url.pathname.match(/\/app\/pet-feed\/posts\/([^/]+)\/?$/i);
  if (fromPath?.[1] && isSafeId(fromPath[1])) return decodeURIComponent(fromPath[1]);
  if (/\/app\/pet-feed\/post\/?$/i.test(url.pathname)) {
    const id = url.searchParams.get('id') || url.searchParams.get('petFeedPost') || '';
    if (isSafeId(id)) return id.trim();
  }
  return '';
}

function isSafeId(value) {
  return /^[a-zA-Z0-9_-]{1,80}$/.test(String(value || '').trim());
}
