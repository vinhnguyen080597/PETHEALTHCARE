import { Router } from 'express';
import { getPublishedPetFeedShareCard } from '../repositories/petFeedRepository.js';

const router = Router();

const SITE_ORIGIN = (process.env.PUBLIC_SITE_ORIGIN || 'https://pet-marketplace.org').replace(/\/+$/, '');
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-share.png`;
const IOS_STORE = 'https://apps.apple.com/app/id6778684107';
const IOS_APP_ID = '6778684107';

function cleanId(value) {
  return String(value || '').trim().slice(0, 80);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteImageUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(raw)) return raw;
  return DEFAULT_OG_IMAGE;
}

function renderShareHtml({ postId, card, canonicalUrl, appUrl }) {
  const title = card?.title || 'Pet Marketplace';
  const description = card?.description
    || 'Xem tin đăng thú cưng và mở bằng ứng dụng Pet Marketplace.';
  const imageUrl = absoluteImageUrl(card?.imageUrl);
  const found = Boolean(card);

  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} · Pet Marketplace</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Pet Marketplace" />
    <meta property="og:locale" content="vi_VN" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />

    <meta name="apple-itunes-app" content="app-id=${IOS_APP_ID}, app-argument=${escapeHtml(appUrl)}" />
    <style>
      :root { color-scheme: light; --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --brand:#1E6FE8; --bg:#f8fafc; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: linear-gradient(180deg, #eef5ff 0%, var(--bg) 42%, #fff 100%); color: var(--ink); }
      main { max-width: 440px; margin: 0 auto; padding: 28px 20px 48px; }
      .card { overflow: hidden; border: 1px solid var(--line); border-radius: 24px; background: #fff; box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08); }
      .media { aspect-ratio: 1.2 / 1; background: #e2e8f0; }
      .media img { display: block; width: 100%; height: 100%; object-fit: cover; }
      .body { padding: 20px; }
      .eyebrow { margin: 0 0 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--brand); }
      h1 { margin: 0; font-size: 24px; line-height: 1.25; }
      .meta { margin: 10px 0 0; color: var(--muted); font-size: 14px; line-height: 1.5; }
      .actions { display: grid; gap: 10px; margin-top: 20px; }
      a.button { display: block; text-align: center; text-decoration: none; border-radius: 14px; padding: 14px 16px; font-weight: 700; font-size: 15px; }
      a.primary { background: var(--brand); color: #fff; }
      a.secondary { background: #eff6ff; color: var(--brand); }
      .foot { margin-top: 18px; text-align: center; color: var(--muted); font-size: 12px; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Pet Marketplace</p>
      <section class="card">
        <div class="media">
          <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" />
        </div>
        <div class="body">
          <h1>${escapeHtml(found ? title : 'Tin đăng không còn khả dụng')}</h1>
          <p class="meta">${escapeHtml(found ? description : 'Tin này có thể đã bị gỡ hoặc chưa được duyệt. Tải ứng dụng để xem các tin khác trên Pet Marketplace.')}</p>
          <div class="actions">
            <a class="button primary" id="open-app" href="${escapeHtml(appUrl)}">Mở trong ứng dụng</a>
            <a class="button secondary" href="${escapeHtml(IOS_STORE)}">Tải trên App Store</a>
          </div>
        </div>
      </section>
      <p class="foot">Nếu ứng dụng đã cài, trang này sẽ cố mở tin đăng tương ứng.</p>
    </main>
    <script>
      (function () {
        var appUrl = ${JSON.stringify(appUrl)};
        var storeUrl = ${JSON.stringify(IOS_STORE)};
        var postId = ${JSON.stringify(postId || '')};
        function tryOpen() {
          if (!postId) return;
          window.location.href = appUrl;
          window.setTimeout(function () {
            if (document.hidden) return;
            window.location.href = storeUrl;
          }, 1600);
        }
        var openApp = document.getElementById('open-app');
        if (openApp) {
          openApp.addEventListener('click', function (event) {
            event.preventDefault();
            tryOpen();
          });
        }
        if (postId) window.setTimeout(tryOpen, 350);
      })();
    </script>
  </body>
</html>`;
}

router.get('/pet-feed/posts/:postId', async (req, res, next) => {
  try {
    const postId = cleanId(req.params.postId);
    if (!postId || !/^[a-zA-Z0-9_-]+$/.test(postId)) {
      return res.status(400).type('html').send(renderShareHtml({
        postId: '',
        card: null,
        canonicalUrl: `${SITE_ORIGIN}/`,
        appUrl: 'pethealthcare://',
      }));
    }

    const card = await getPublishedPetFeedShareCard(postId);
    const canonicalUrl = `${SITE_ORIGIN}/app/pet-feed/posts/${encodeURIComponent(postId)}/`;
    const appUrl = `pethealthcare://pet-feed/posts/${encodeURIComponent(postId)}`;
    const html = renderShareHtml({ postId, card, canonicalUrl, appUrl });
    res.status(card ? 200 : 404).type('html').set({
      'Cache-Control': 'public, max-age=120',
    }).send(html);
  } catch (err) {
    return next(err);
  }
});

export default router;
