# Pet Feed share / Open Graph

Share links use:

`https://pet-marketplace.org/app/pet-feed/post/?id={postId}`

Legacy Universal Link path still works:

`https://pet-marketplace.org/app/pet-feed/posts/{postId}/`

## Why previews looked generic

GitHub Pages is static. Crawlers (Zalo / Messenger / Facebook) need `og:title`, `og:description`, and `og:image` in the first HTML response. They do not run the landing-page JavaScript.

## What ships in this repo

1. Brand Open Graph tags + `docs/og-share.png` on the landing / 404 pages.
2. Public API: `GET /api/v1/public/pet-feed/posts/:postId` (published only).
3. SSR share HTML: `GET /share/pet-feed/posts/:postId` on the Render backend (title + pet image).
4. Optional Cloudflare Worker: `infrastructure/cloudflare-share-worker.js` — proxies `/app/pet-feed/*` to the SSR page so previews stay on `pet-marketplace.org` with per-post metadata.

## Enable per-post rich previews (recommended)

1. Deploy backend (public + share routes).
2. Put `pet-marketplace.org` behind Cloudflare (orange cloud).
3. Create a Worker from `infrastructure/cloudflare-share-worker.js`.
4. Route: `pet-marketplace.org/app/pet-feed/*`
5. Re-share a listing (or refresh Zalo/Facebook cache) and confirm title + image appear.

Without the Worker, shared links still show a branded Pet Marketplace card (logo + site name) instead of a raw URL.
