import fs from 'node:fs';
import path from 'node:path';

const viDesc = 'Xem tin \u0111\u0103ng th\u00fa c\u01b0ng tr\u00ean Pet Marketplace v\u00e0 m\u1edf b\u1eb1ng \u1ee9ng d\u1ee5ng.';
const viShort = 'Xem tin \u0111\u0103ng th\u00fa c\u01b0ng tr\u00ean Pet Marketplace.';

const landing = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pet Marketplace</title>
    <meta name="description" content="${viDesc}" />
    <link rel="canonical" id="canonical" href="https://pet-marketplace.org/app/pet-feed/post/" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Pet Marketplace" />
    <meta property="og:locale" content="vi_VN" />
    <meta property="og:url" id="og-url" content="https://pet-marketplace.org/app/pet-feed/post/" />
    <meta property="og:title" id="og-title" content="Pet Marketplace" />
    <meta property="og:description" id="og-description" content="${viDesc}" />
    <meta property="og:image" id="og-image" content="https://pet-marketplace.org/og-share.png" />
    <meta property="og:image:alt" content="Pet Marketplace" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" id="tw-title" content="Pet Marketplace" />
    <meta name="twitter:description" id="tw-description" content="${viDesc}" />
    <meta name="twitter:image" id="tw-image" content="https://pet-marketplace.org/og-share.png" />
    <link rel="stylesheet" href="../../../styles.css" />
    <style>
      .share-card{overflow:hidden;border:1px solid #e2e8f0;border-radius:24px;background:#fff;box-shadow:0 18px 50px rgba(15,23,42,.08);margin-top:20px}
      .share-media{aspect-ratio:1.2/1;background:#e2e8f0}
      .share-media img{display:block;width:100%;height:100%;object-fit:cover}
      .share-body{padding:18px 18px 20px}
      .share-title{margin:0;font-size:22px;line-height:1.25}
      .share-meta{margin:8px 0 0;color:#64748b;font-size:14px;line-height:1.5}
    </style>
    <script>
      window.__PHC_IOS_APP_ID__='6778684107';
      window.__PHC_IOS_STORE__='https://apps.apple.com/app/id6778684107';
      window.__PHC_ANDROID_STORE__='';
      window.__PHC_PUBLIC_API_ORIGIN__='https://pet-health-backend-serb.onrender.com';
    </script>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <p class="eyebrow">Pet Marketplace</p>
        <h1 id="heading">Open this listing</h1>
        <p class="lead" id="lead">If you already have the app, we will open the post there. Otherwise you can download Pet Marketplace from the App Store.</p>
        <div class="share-card" id="share-card" hidden>
          <div class="share-media"><img id="share-image" alt="" /></div>
          <div class="share-body">
            <h2 class="share-title" id="share-title"></h2>
            <p class="share-meta" id="share-meta"></p>
          </div>
        </div>
        <nav class="nav" aria-label="Open actions">
          <a class="button" id="open-app" href="#">Open in app</a>
          <a class="button secondary" id="get-app" href="#">Get the app</a>
        </nav>
        <p class="meta" id="status" style="margin-top:16px"></p>
      </section>
    </main>
    <script>
      (function(){
        function qs(name){return new URLSearchParams(window.location.search).get(name)||'';}
        function postIdFromPath(){var m=window.location.pathname.match(/\\/app\\/pet-feed\\/posts\\/([^/]+)\\/?$/i);return m?decodeURIComponent(m[1]):'';}
        function setMeta(id,attr,value){var el=document.getElementById(id);if(el&&value)el.setAttribute(attr,value);}
        var postId=(qs('id')||qs('petFeedPost')||postIdFromPath()).trim();
        var appUrl=postId?'pethealthcare://pet-feed/posts/'+encodeURIComponent(postId):'pethealthcare://';
        var canonicalPath=postId?'https://pet-marketplace.org/app/pet-feed/posts/'+encodeURIComponent(postId)+'/':window.location.href.split('#')[0];
        var ua=navigator.userAgent||'';
        var isIOS=/iPad|iPhone|iPod/.test(ua);
        var isAndroid=/Android/i.test(ua);
        var iosStore=window.__PHC_IOS_STORE__||'';
        var androidStore=window.__PHC_ANDROID_STORE__||'';
        var storeUrl=isIOS?iosStore:isAndroid?androidStore:iosStore;
        var iosAppId=window.__PHC_IOS_APP_ID__||'';
        var apiOrigin=(window.__PHC_PUBLIC_API_ORIGIN__||'').replace(/\\/+$/,'');
        setMeta('canonical','href',canonicalPath);
        setMeta('og-url','content',canonicalPath);
        if(iosAppId){var meta=document.createElement('meta');meta.name='apple-itunes-app';meta.content='app-id='+iosAppId+(postId?', app-argument='+appUrl:'');document.head.appendChild(meta);}
        var openApp=document.getElementById('open-app');
        var getApp=document.getElementById('get-app');
        var statusEl=document.getElementById('status');
        openApp.href=appUrl; getApp.href=storeUrl||'#';
        if(isAndroid&&!androidStore){getApp.style.display='none';statusEl.textContent='Pet Marketplace is currently available on the App Store (iPhone). Android / Play Store will come later.';}
        else if(!storeUrl){getApp.style.display='none';statusEl.textContent='App Store link will appear here after the iOS listing is live.';}
        if(!postId){document.getElementById('lead').textContent='Missing listing id. Ask the sender to share the post again from Pet Marketplace.';openApp.style.display='none';return;}
        function tryOpenApp(){window.location.href=appUrl;window.setTimeout(function(){if(document.hidden)return;if(storeUrl)window.location.href=storeUrl;},1600);}
        openApp.addEventListener('click',function(e){e.preventDefault();tryOpenApp();});
        function applyCard(card){if(!card)return;var title=String(card.title||'Pet Marketplace');var description=String(card.description||'');var imageUrl=String(card.imageUrl||'https://pet-marketplace.org/og-share.png');document.title=title+' \\u00b7 Pet Marketplace';document.getElementById('heading').textContent=title;document.getElementById('lead').textContent=description;setMeta('og-title','content',title);setMeta('og-description','content',description);setMeta('og-image','content',imageUrl);setMeta('tw-title','content',title);setMeta('tw-description','content',description);setMeta('tw-image','content',imageUrl);document.getElementById('share-title').textContent=title;document.getElementById('share-meta').textContent=description;var img=document.getElementById('share-image');img.src=imageUrl;img.alt=title;document.getElementById('share-card').hidden=false;}
        if(apiOrigin&&postId){fetch(apiOrigin+'/api/v1/public/pet-feed/posts/'+encodeURIComponent(postId),{headers:{Accept:'application/json'}}).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j&&j.data)applyCard(j.data);}).catch(function(){});}
        window.setTimeout(tryOpenApp,250);
      })();
    </script>
  </body>
</html>
`;

const notFound = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pet Marketplace</title>
    <meta name="description" content="${viShort}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Pet Marketplace" />
    <meta property="og:title" content="Pet Marketplace" />
    <meta property="og:description" content="${viDesc}" />
    <meta property="og:image" content="https://pet-marketplace.org/og-share.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Pet Marketplace" />
    <meta name="twitter:description" content="${viShort}" />
    <meta name="twitter:image" content="https://pet-marketplace.org/og-share.png" />
    <script>
      (function () {
        var path = window.location.pathname || '';
        var match = path.match(/\\/app\\/pet-feed\\/posts\\/([^/]+)\\/?$/i);
        if (match && match[1]) {
          var base = path.indexOf('/PETHEALTHCARE/') >= 0 ? '/PETHEALTHCARE' : '';
          window.location.replace(base + '/app/pet-feed/post/?id=' + encodeURIComponent(decodeURIComponent(match[1])));
          return;
        }
        var home = path.indexOf('/PETHEALTHCARE/') >= 0 ? '/PETHEALTHCARE/' : '/';
        window.location.replace(home);
      })();
    </script>
  </head>
  <body>
    <p>Redirecting to Pet Marketplace...</p>
  </body>
</html>
`;

fs.writeFileSync(path.join('docs', 'app', 'pet-feed', 'post', 'index.html'), landing, 'utf8');
fs.writeFileSync(path.join('docs', '404.html'), notFound, 'utf8');
console.log('Wrote docs landing + 404 with unicode VI text');
