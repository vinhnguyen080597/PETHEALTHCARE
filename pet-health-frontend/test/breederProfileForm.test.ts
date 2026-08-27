import assert from 'node:assert/strict';
import test from 'node:test';
import { showAccountBreederStatusBadge } from '../src/utils/accountBreederStatusBadge.ts';
import {
  hasAllBreederCommitments,
  setBreederCommitmentsAccepted,
} from '../src/utils/breederCommitments.ts';
import { breederFormChipTone } from '../src/utils/breederFormChips.ts';
import { readBreederFormMetadata } from '../src/utils/breederFormMetadata.ts';
import { registrationUnitsForSpecies } from '../src/utils/breederRegistrationUnits.ts';
import { resolveBreederProfileReturnScreen } from '../src/utils/breederProfileNavigation.ts';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import vi from '../src/i18n/locales/vi.json' with { type: 'json' };

test('showAccountBreederStatusBadge hides verified only', () => {
  assert.equal(showAccountBreederStatusBadge('verified'), false);
  assert.equal(showAccountBreederStatusBadge('pending_review'), true);
  assert.equal(showAccountBreederStatusBadge('rejected'), true);
  assert.equal(showAccountBreederStatusBadge('unverified'), true);
});

test('breeder commitments toggle both keys', () => {
  assert.equal(hasAllBreederCommitments([]), false);
  const accepted = setBreederCommitmentsAccepted([], true);
  assert.equal(hasAllBreederCommitments(accepted), true);
  assert.deepEqual(
    accepted.sort(),
    ['accurate_information', 'app_only_verification'].sort(),
  );
  assert.equal(hasAllBreederCommitments(setBreederCommitmentsAccepted(accepted, false)), false);
});

test('readBreederFormMetadata prefers camelCase and falls back to snake_case', () => {
  assert.equal(
    readBreederFormMetadata({ breeder_type: 'registered_kennel' }).breederType,
    'registered_kennel',
  );
  assert.equal(
    readBreederFormMetadata({
      breederType: 'home_breeder',
      breeder_type: 'registered_kennel',
    }).breederType,
    'home_breeder',
  );
  assert.deepEqual(
    readBreederFormMetadata({
      transparency_commitments: ['accurate_information', 'app_only_verification'],
    }).transparencyCommitments,
    ['accurate_information', 'app_only_verification'],
  );
  assert.equal(
    readBreederFormMetadata({ registered_kennel_name: 'Cat House' }).registeredKennelName,
    'Cat House',
  );
});

test('breeder form chip tones match outline (type) and filled (species)', () => {
  const outlineOn = breederFormChipTone(true, 'outline');
  assert.match(outlineOn.container, /bg-white/);
  assert.match(outlineOn.container, /border-\[#F97316\]/);
  assert.match(outlineOn.text, /text-\[#F97316\]/);
  const outlineOff = breederFormChipTone(false, 'outline');
  assert.match(outlineOff.container, /bg-\[#F3F4F6\]/);
  const filledOn = breederFormChipTone(true, 'filled');
  assert.match(filledOn.container, /bg-\[#D97706\]/);
  assert.equal(filledOn.text, 'text-white');
});

test('cat registration units match web kennel options', () => {
  assert.deepEqual(registrationUnitsForSpecies('cat'), [
    'wcf_vca',
    'vca',
    'tica',
    'cfa',
    'avf',
    'other',
  ]);
  assert.deepEqual(registrationUnitsForSpecies('dog'), ['vka', 'other']);
});

test('resolveBreederProfileReturnScreen keeps prior farm/account screens', () => {
  assert.equal(resolveBreederProfileReturnScreen('breeder-detail', false), 'breeder-detail');
  assert.equal(resolveBreederProfileReturnScreen('farm-health', false), 'farm-health');
  assert.equal(resolveBreederProfileReturnScreen('account', false), 'account');
  assert.equal(resolveBreederProfileReturnScreen('breeder-profile', false), 'account');
  assert.equal(resolveBreederProfileReturnScreen('breeder-profile', true), 'home');
});

test('breederProfile edit/create i18n EN/VI parity', () => {
  assert.equal(vi.breederProfile.editTitle, 'Chỉnh sửa hồ sơ');
  assert.equal(en.breederProfile.editTitle, 'Edit profile');
  assert.equal(vi.farm.owner.editProfile, 'Chỉnh sửa hồ sơ');
  assert.equal(en.farm.owner.editProfile, 'Edit profile');
  assert.equal(vi.breederProfile.createTitle.length > 0, true);
  assert.equal(en.breederProfile.subtitle.length > 0, true);
  assert.equal(vi.breederProfile.mainBreedsHint.length > 0, true);
  assert.equal(en.breederProfile.registeredAtPlaceholder, 'YYYY');
  assert.equal(vi.breederProfile.applicationType, 'Loại hình đăng ký');
  assert.equal(vi.breederProfile.breederTypes.registered_kennel, 'Trại đăng ký chính thức');
  assert.equal(vi.breederProfile.registrationUnitPlaceholder.length > 0, true);
  assert.equal(en.breederProfile.registrationUnitPlaceholder.length > 0, true);
});
