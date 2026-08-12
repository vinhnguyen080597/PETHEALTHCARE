import test from 'node:test';
import assert from 'node:assert/strict';
import { VIETNAM_PROVINCES } from '../src/constants/vietnamProvinces.ts';
import { resolveProvinceSelection } from '../src/utils/vietnamProvinceSelection.ts';

test('VIETNAM_PROVINCES has 34 post-merger provinces and cities', () => {
  assert.equal(VIETNAM_PROVINCES.length, 34);
});

test('resolveProvinceSelection maps legacy province names', () => {
  assert.equal(resolveProvinceSelection('Bình Dương'), 'TP. Hồ Chí Minh');
  assert.equal(resolveProvinceSelection('Thừa Thiên Huế'), 'TP. Huế');
});
