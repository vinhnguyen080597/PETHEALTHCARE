import test from 'node:test';
import assert from 'node:assert/strict';
import { BRAND } from '../src/theme/brand.ts';
import {
  buttonContainerStyle,
  buttonIconColor,
  buttonLabelStyle,
  tabActiveContainerStyle,
} from '../src/theme/buttonStyles.ts';

test('text tokens match design spec', () => {
  assert.equal(BRAND.textPrimary, '#0F172A');
  assert.equal(BRAND.textSecondary, '#334155');
  assert.equal(BRAND.textMuted, '#64748B');
  assert.equal(BRAND.textBrandLink, '#EA580C');
  assert.equal(BRAND.textInverse, '#FFFFFF');
});

test('border tokens match design spec', () => {
  assert.equal(BRAND.borderLight, '#F1F5F9');
  assert.equal(BRAND.borderCard, '#E2E8F0');
  assert.equal(BRAND.borderBrand, '#FED7AA');
});

test('button tokens match design spec', () => {
  assert.equal(BRAND.btnPrimary, '#F97316');
  assert.equal(BRAND.btnPrimaryActive, '#EA580C');
  assert.equal(BRAND.btnSecondary, '#FFF7ED');
});

test('full-page loading spinner uses brand orange', () => {
  assert.equal(BRAND.loadingSpinner, '#F97316');
  assert.equal(BRAND.loadingSpinner, BRAND.btnPrimary);
});

test('pet profile accent tokens use brand orange', () => {
  assert.equal(BRAND.btnPrimary, '#F97316');
  assert.equal(BRAND.textBrandLink, '#EA580C');
  assert.equal(BRAND.surfaceLight, '#FFF7ED');
  assert.equal(BRAND.borderBrand, '#FED7AA');
});

test('primary button uses orange-500 default and orange-600 when pressed', () => {
  assert.deepEqual(buttonContainerStyle('primary', false), { backgroundColor: '#F97316' });
  assert.deepEqual(buttonContainerStyle('primary', true), { backgroundColor: '#EA580C' });
  assert.equal(buttonLabelStyle('primary').color, '#FFFFFF');
  assert.equal(buttonIconColor('primary'), '#FFFFFF');
});

test('secondary button uses orange-50 surface, brand border, orange-600 label', () => {
  assert.deepEqual(buttonContainerStyle('secondary', false), {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  });
  assert.equal(buttonLabelStyle('secondary').color, '#EA580C');
  assert.equal(buttonIconColor('secondary'), '#EA580C');
});

test('outline button uses white card with slate-200 border', () => {
  assert.equal(buttonContainerStyle('outline', false).backgroundColor, '#FFFFFF');
  assert.equal(buttonContainerStyle('outline', false).borderColor, '#E2E8F0');
  assert.equal(buttonLabelStyle('outline').color, '#0F172A');
});

test('active tab pill uses secondary surface and brand border', () => {
  assert.deepEqual(tabActiveContainerStyle(), {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  });
});
