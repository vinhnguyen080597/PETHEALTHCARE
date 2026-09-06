export const COVER_CROP_ASPECT = 16 / 9;
export const COVER_CROP_MIN_SCALE = 1;
export const COVER_CROP_MAX_SCALE = 4;

export type CoverCropTransform = {
  tx: number;
  ty: number;
  scale: number;
};

export type CoverCropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export type CoverCropSource = {
  uri: string;
  width: number;
  height: number;
};

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function coverFillScale(
  imageWidth: number,
  imageHeight: number,
  viewWidth: number,
  viewHeight: number,
) {
  if (imageWidth <= 0 || imageHeight <= 0 || viewWidth <= 0 || viewHeight <= 0) return 1;
  return Math.max(viewWidth / imageWidth, viewHeight / imageHeight);
}

export function coverImageDisplaySize(
  imageWidth: number,
  imageHeight: number,
  viewWidth: number,
  viewHeight: number,
  scale: number,
) {
  const fill = coverFillScale(imageWidth, imageHeight, viewWidth, viewHeight);
  const displayScale = fill * clampNumber(scale, COVER_CROP_MIN_SCALE, COVER_CROP_MAX_SCALE);
  return {
    width: imageWidth * displayScale,
    height: imageHeight * displayScale,
  };
}

export function clampCoverTransform(
  imageWidth: number,
  imageHeight: number,
  viewWidth: number,
  viewHeight: number,
  transform: CoverCropTransform,
): CoverCropTransform {
  const scale = clampNumber(transform.scale, COVER_CROP_MIN_SCALE, COVER_CROP_MAX_SCALE);
  const display = coverImageDisplaySize(imageWidth, imageHeight, viewWidth, viewHeight, scale);
  const maxTx = Math.max(0, (display.width - viewWidth) / 2);
  const maxTy = Math.max(0, (display.height - viewHeight) / 2);
  return {
    tx: clampNumber(transform.tx, -maxTx, maxTx),
    ty: clampNumber(transform.ty, -maxTy, maxTy),
    scale,
  };
}

/** Pixel crop that matches the visible 16:9 viewport after pan/zoom. */
export function computeCoverCropRect(
  imageWidth: number,
  imageHeight: number,
  viewWidth: number,
  viewHeight: number,
  transform: CoverCropTransform,
): CoverCropRect {
  const next = clampCoverTransform(imageWidth, imageHeight, viewWidth, viewHeight, transform);
  const fill = coverFillScale(imageWidth, imageHeight, viewWidth, viewHeight);
  const displayScale = fill * next.scale;
  const cropW = viewWidth / displayScale;
  const cropH = viewHeight / displayScale;
  const originX = clampNumber(
    (imageWidth - cropW) / 2 - next.tx / displayScale,
    0,
    Math.max(0, imageWidth - cropW),
  );
  const originY = clampNumber(
    (imageHeight - cropH) / 2 - next.ty / displayScale,
    0,
    Math.max(0, imageHeight - cropH),
  );
  const originXi = Math.max(0, Math.floor(originX));
  const originYi = Math.max(0, Math.floor(originY));
  return {
    originX: originXi,
    originY: originYi,
    width: Math.max(1, Math.min(Math.round(cropW), imageWidth - originXi)),
    height: Math.max(1, Math.min(Math.round(cropH), imageHeight - originYi)),
  };
}

export function coverCropSourceFromPicker(asset: {
  uri?: string | null;
  width?: number | null;
  height?: number | null;
}): CoverCropSource | null {
  const uri = typeof asset.uri === 'string' ? asset.uri.trim() : '';
  const width = Number(asset.width);
  const height = Number(asset.height);
  if (!uri || !(width > 0) || !(height > 0)) return null;
  return { uri, width, height };
}

export function coverCropViewportSize(windowWidth: number, horizontalPadding = 40) {
  const width = Math.max(240, windowWidth - horizontalPadding);
  return { width, height: Math.round(width / COVER_CROP_ASPECT) };
}
