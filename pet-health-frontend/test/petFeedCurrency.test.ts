import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPetFeedPrice,
  normalizePetFeedPriceInput,
  parsePetFeedPriceToVnd,
  petFeedPriceInputUnit,
} from '../src/utils/petFeedCurrency.ts';

test('parses legacy ca price as million VND', () => {
  assert.equal(parsePetFeedPriceToVnd('10 cá'), 10_000_000);
});

test('formats price by UI language', () => {
  assert.equal(formatPetFeedPrice('10000000 VND', 'vi'), '10.000.000 ₫');
  assert.equal(formatPetFeedPrice('10000000 VND', 'en'), '$394');
});

test('normalizes numeric input using active language currency', () => {
  assert.equal(normalizePetFeedPriceInput('10000000', 'vi'), '10000000 VND');
  assert.equal(normalizePetFeedPriceInput('400', 'en'), '10160000 VND');
});

test('keeps free-text price notes unchanged', () => {
  assert.equal(normalizePetFeedPriceInput('Contact breeder', 'en'), 'Contact breeder');
  assert.equal(formatPetFeedPrice('Contact breeder', 'vi'), 'Contact breeder');
});

test('returns expected input unit by language', () => {
  assert.equal(petFeedPriceInputUnit('vi'), 'VND');
  assert.equal(petFeedPriceInputUnit('en'), 'USD');
});
