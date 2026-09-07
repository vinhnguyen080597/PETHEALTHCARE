import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COVER_CROP_ASPECT,
  clampCoverTransform,
  computeCoverCropRect,
  coverCropSourceFromPicker,
  coverCropViewportSize,
  coverFillScale,
  listingThumbCropViewportSize,
} from '../src/utils/farmCoverCrop.ts';

test('16:9 image at scale 1 crops the full photo', () => {
  const rect = computeCoverCropRect(1600, 900, 320, 180, { tx: 0, ty: 0, scale: 1 });
  assert.equal(rect.originX, 0);
  assert.equal(rect.originY, 0);
  assert.equal(rect.width, 1600);
  assert.equal(rect.height, 900);
});

test('portrait image at scale 1 uses full width and a centered 16:9 band', () => {
  const rect = computeCoverCropRect(900, 1600, 320, 180, { tx: 0, ty: 0, scale: 1 });
  assert.equal(rect.originX, 0);
  assert.equal(rect.width, 900);
  assert.ok(Math.abs(rect.height / rect.width - 1 / COVER_CROP_ASPECT) < 0.02);
  assert.ok(rect.originY > 400);
  assert.ok(rect.originY + rect.height < 1600);
});

test('panning down reveals the top of a portrait photo', () => {
  const centered = computeCoverCropRect(900, 1600, 320, 180, { tx: 0, ty: 0, scale: 1 });
  const panned = computeCoverCropRect(900, 1600, 320, 180, { tx: 0, ty: 400, scale: 1 });
  assert.ok(panned.originY < centered.originY);
  assert.equal(panned.originX, 0);
});

test('out-of-range pan is clamped so the crop stays inside the image', () => {
  const rect = computeCoverCropRect(900, 1600, 320, 180, { tx: 9999, ty: -9999, scale: 1 });
  assert.equal(rect.originX, 0);
  assert.ok(rect.originY >= 0);
  assert.ok(rect.originY + rect.height <= 1600);
});

test('zoom 2 on a 16:9 image halves the crop window', () => {
  const rect = computeCoverCropRect(1600, 900, 320, 180, { tx: 0, ty: 0, scale: 2 });
  assert.equal(rect.width, 800);
  assert.equal(rect.height, 450);
  assert.equal(rect.originX, 400);
  assert.equal(rect.originY, 225);
});

test('cover fill scale prefers the axis that covers the viewport', () => {
  assert.equal(coverFillScale(900, 1600, 320, 180), 320 / 900);
  assert.equal(coverFillScale(2000, 900, 320, 180), 180 / 900);
});

test('clampCoverTransform keeps scale between 1 and 4', () => {
  const next = clampCoverTransform(1600, 900, 320, 180, { tx: 0, ty: 0, scale: 8 });
  assert.equal(next.scale, 4);
});

test('coverCropSourceFromPicker rejects missing dimensions', () => {
  assert.equal(coverCropSourceFromPicker({ uri: 'file://a.jpg', width: 0, height: 10 }), null);
  assert.deepEqual(coverCropSourceFromPicker({ uri: 'file://a.jpg', width: 12, height: 8 }), {
    uri: 'file://a.jpg',
    width: 12,
    height: 8,
  });
});

test('coverCropViewportSize keeps a 16:9 frame', () => {
  const view = coverCropViewportSize(400, 40);
  assert.equal(view.width, 360);
  assert.equal(view.height, Math.round(360 / COVER_CROP_ASPECT));
});

test('listingThumbCropViewportSize matches listing-card aspect', () => {
  const view = listingThumbCropViewportSize(400, 900, 288, 40);
  assert.equal(view.width, 360);
  assert.equal(view.height, 288);
  assert.ok(Math.abs(view.width / view.height - 360 / 288) < 0.01);
});
