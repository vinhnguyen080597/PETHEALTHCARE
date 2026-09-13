#!/usr/bin/env node

const SUPPORT_EMAIL = 'support@pet-marketplace.org';
const CONTACT_EMAIL = 'contact@pet-marketplace.org';
const SITE_ORIGIN = (process.env.EXPO_PUBLIC_SITE_ORIGIN || 'https://pet-marketplace.org').replace(
  /\/+$/,
  '',
);

const PAGES = [
  {
    name: 'Homepage legal footer',
    url: `${SITE_ORIGIN}/`,
    mustContain: ['href="/privacy-policy"', 'href="/terms-of-service"'],
  },
  {
    name: 'Privacy Policy',
    url: `${SITE_ORIGIN}/privacy-policy`,
    mustContain: [CONTACT_EMAIL],
    mustContainAny: [['Decree 13', 'Nghị định 13'], ['Privacy Policy', 'Chính sách bảo mật']],
  },
  {
    name: 'Terms of Service',
    url: `${SITE_ORIGIN}/terms-of-service`,
    mustContain: [CONTACT_EMAIL],
    mustContainAny: [
      ['NOT the seller', 'KHÔNG phải là người bán'],
      ['Terms of Service', 'Điều khoản dịch vụ'],
    ],
  },
  {
    name: 'Marketplace Guidelines',
    url: `${SITE_ORIGIN}/marketplace-guidelines`,
    mustContainAny: [
      ['does NOT itself provide pet shipping', 'KHÔNG trực tiếp cung cấp dịch vụ vận chuyển'],
      ['Marketplace Guidelines', 'Nội quy Marketplace'],
    ],
  },
  {
    name: 'Support',
    url: `${SITE_ORIGIN}/support`,
    mustContain: [SUPPORT_EMAIL, CONTACT_EMAIL, 'mailto:'],
  },
];

const TIMEOUT_MS = Number(process.env.RELEASE_VERIFY_TIMEOUT_MS || 20000);

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, url: response.url, text };
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

  for (const needle of page.mustContain || []) {
    if (!result.text.includes(needle)) {
      fail(`${page.name} (${result.url}) missing expected content: "${needle}"`);
    }
  }

  for (const group of page.mustContainAny || []) {
    if (!group.some((needle) => result.text.includes(needle))) {
      fail(`${page.name} (${result.url}) missing one of: ${group.map((item) => `"${item}"`).join(', ')}`);
    }
  }

  if (process.exitCode !== 1) {
    console.log(`OK  ${page.name} -> ${result.url}`);
  }
}

async function main() {
  console.log(`Verifying public legal/support pages at ${SITE_ORIGIN}`);
  for (const page of PAGES) {
    await verifyPage(page);
  }

  if (process.exitCode === 1) {
    console.error('\nPublic link verification failed. Deploy pet-health-web to pet-marketplace.org, then rerun yarn release:verify:public-links.');
    process.exit(1);
  }

  console.log('\nPublic link verification passed.');
}

await main();
