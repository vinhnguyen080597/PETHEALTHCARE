/** Admin-only post media download helpers (mobile). */

export function canDownloadPostMedia(isAdmin: boolean | null | undefined): boolean {
  return Boolean(isAdmin);
}

export function mediaDownloadFileName(
  url: string,
  fallbackBase = 'pet-marketplace-media',
): string {
  try {
    const path = new URL(url).pathname;
    const base = path.split('/').filter(Boolean).pop() || '';
    if (base && /\.[a-z0-9]{2,5}$/i.test(base)) return base;
  } catch {
    // ignore invalid URL
  }
  const clean = fallbackBase.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${clean || 'pet-marketplace-media'}.bin`;
}

export function selectedMediaDownloadUrl(media: {
  type: 'image' | 'video';
  uri: string;
} | null): string | null {
  const uri = String(media?.uri || '').trim();
  return uri || null;
}
