import {
  FUNCTION_SAFE_PHOTO_BYTES,
  shouldCompressDealPhoto,
} from "./dealPhotoUpload";

const DEFAULT_MAX_EDGE = 1600;
const DEFAULT_QUALITY = 0.82;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/** Shrink a deal evidence photo so it fits serverless upload limits. */
export async function compressImageFile(
  file: File,
  options?: { maxEdge?: number; quality?: number; maxBytes?: number },
): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!shouldCompressDealPhoto(file)) return file;

  try {
    const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
    const quality = options?.quality ?? DEFAULT_QUALITY;
    const maxBytes = options?.maxBytes ?? FUNCTION_SAFE_PHOTO_BYTES;

    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (!blob) return file;
    const next = new File(
      [blob],
      file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg",
      { type: "image/jpeg", lastModified: Date.now() },
    );
    if (next.size > maxBytes && quality > 0.55) {
      return compressImageFile(file, {
        maxEdge: Math.round(maxEdge * 0.85),
        quality: quality - 0.12,
        maxBytes,
      });
    }
    return next.size > 0 && next.size < file.size ? next : file;
  } catch {
    return file;
  }
}
