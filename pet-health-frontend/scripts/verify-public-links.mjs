#!/usr/bin/env node

const SUPPORT_EMAIL = 'cattieshealthcare@gmail.com';
const SITE_ORIGIN = (process.env.EXPO_PUBLIC_SITE_ORIGIN || 'https://vinhnguyen080597.github.io/PETHEALTHCARE').replace(
  /\/+$/,
  '',
);

const PAGES = [
  {
    name: 'Legal Center',
    url: `${SITE_ORIGIN}/`,
    mustContain: [SUPPORT_EMAIL, 'Legal Center'],
  },
  {
    name: 'Privacy Policy',
    url: `${SITE_ORIGIN}/privacy-policy/`,
    mustContain: [SUPPORT_EMAIL, 'Privacy Policy', '13. Contact'],
  },
  {
    name: 'Terms of Service',
    url: `${SITE_ORIGIN}/terms-of-service/`,
    mustContain: [SUPPORT_EMAIL, 'Terms of Service', '16. Contact'],
  },
  {
    name: 'Support',
    url: `${SITE_ORIGIN}/support/`,
    mustContain: [SUPPORT_EMAIL, 'Contact Support', 'mailto:'],
  },
];

const TIMEOUT_MS = Number(process.env.RELEASE_VERIFY_TIMEOUT_MS || 20000);

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } finally {
    clearTimeout(timer);
  }
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

async function verifyPage(page) {
  let result;
  try {
    result = await fetchText(page.url);
  } catch (error) {
    fail(`${page.name} (${page.url}) request failed: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  if (!result.ok) {
    fail(`${page.name} (${page.url}) returned HTTP ${result.status}`);
    return;
  }

  for (const needle of page.mustContain) {
    if (!result.text.includes(needle)) {
      fail(`${page.name} (${page.url}) missing expected content: "${needle}"`);
    }
  }

  if (process.exitCode !== 1) {
    console.log(`OK  ${page.name} -> ${page.url}`);
  }
}

async function main() {
  console.log(`Verifying public legal/support pages at ${SITE_ORIGIN}`);
  for (const page of PAGES) {
    await verifyPage(page);
  }

  if (process.exitCode === 1) {
    console.error('\nPublic link verification failed. Deploy /docs to GitHub Pages, then rerun yarn release:verify:public-links.');
    process.exit(1);
  }

  console.log('\nPublic link verification passed.');
}

await main();
