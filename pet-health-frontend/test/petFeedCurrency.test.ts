import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPetFeedPrice,
  formatPetFeedPriceInputDisplay,
  normalizePetFeedPriceInput,
  parsePetFeedPriceToVnd,
  petFeedPriceInputFromStored,
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

test('formats VND input with thousand separators', () => {
  assert.equal(formatPetFeedPriceInputDisplay('5000000', 'vi'), '5.000.000');
  assert.equal(formatPetFeedPriceInputDisplay('5.000.000', 'vi'), '5.000.000');
  assert.equal(formatPetFeedPriceInputDisplay('0123', 'vi'), '123');
});

test('formats USD input with thousand separators', () => {
  assert.equal(formatPetFeedPriceInputDisplay('1200', 'en'), '1,200');
});

test('prefills grouped amount from stored VND note', () => {
  assert.equal(petFeedPriceInputFromStored('5000000 VND', 'vi'), '5.000.000');
  assert.equal(petFeedPriceInputFromStored('10160000 VND', 'en'), '400');
});

test('normalizes grouped VND input', () => {
  assert.equal(normalizePetFeedPriceInput('5.000.000', 'vi'), '5000000 VND');
});

test('returns expected input unit by language', () => {
  assert.equal(petFeedPriceInputUnit('vi'), 'VND');
  assert.equal(petFeedPriceInputUnit('en'), 'USD');
});
