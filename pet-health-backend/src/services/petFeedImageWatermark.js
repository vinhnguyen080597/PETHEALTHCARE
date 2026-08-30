import sharp from 'sharp';

/** Baked into listing/feed photos only (not video). */
export const PET_FEED_IMAGE_WATERMARK_TEXT = 'PetCare: Pet Marketplace';
export const PET_FEED_IMAGE_WATERMARK_OPACITY = 0.1;
/** Diagonal text tilt (degrees, SVG rotate). */
export const PET_FEED_IMAGE_WATERMARK_ROTATE_DEG = -30;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function encodeWatermarked(pipeline, mimetype) {
  const mime = typeof mimetype === 'string' ? mimetype.trim().toLowerCase() : '';
  if (mime === 'image/png') return pipeline.png().toBuffer();
  if (mime === 'image/webp') return pipeline.webp({ quality: 85 }).toBuffer();
  return pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}

/**
 * Composite a faint centered brand watermark into image bytes.
 * Text only (no pill/border), opacity 0.1, rotated -30°.
 * Fail-open: returns the original buffer if processing fails.
 */
export async function bakePetFeedImageWatermark(buffer, mimetype) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return buffer;

  try {
    const meta = await sharp(buffer, { failOn: 'none' }).metadata();
    const width = Number(meta.width) || 0;
    const height = Number(meta.height) || 0;
    if (width < 32 || height < 32) return buffer;

    const text = PET_FEED_IMAGE_WATERMARK_TEXT.toUpperCase();
    const fontSize = Math.max(16, Math.round(Math.min(width, height) * 0.055));
    const cx = Math.round(width / 2);
    const cy = Math.round(height / 2);
    const fill = `rgba(255,255,255,${PET_FEED_IMAGE_WATERMARK_OPACITY})`;

    const svg = Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="${cx}" y="${cy}" dominant-baseline="middle" text-anchor="middle"
    transform="rotate(${PET_FEED_IMAGE_WATERMARK_ROTATE_DEG} ${cx} ${cy})"
    font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="600"
    letter-spacing="2" fill="${fill}">${escapeXml(text)}</text>
</svg>`,
    );

    const pipeline = sharp(buffer, { failOn: 'none' }).composite([
      { input: svg, top: 0, left: 0 },
    ]);
    return await encodeWatermarked(pipeline, mimetype);
  } catch {
    return buffer;
  }
}
