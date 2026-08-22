import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BRAND_NAME_SHORT, splitBrandName } from '../src/utils/brandDisplay.ts';

describe('splitBrandName', () => {
  it('splits PetCare marketplace title for header wordmark', () => {
    assert.deepEqual(splitBrandName('PetCare: Pet Marketplace'), {
      lead: 'PetCare',
      rest: ': Pet Marketplace',
    });
  });

  it('returns full string as lead when prefix does not match', () => {
    assert.deepEqual(splitBrandName('Other title'), {
      lead: 'Other title',
      rest: '',
    });
  });

  it('exports short brand constant', () => {
    assert.equal(BRAND_NAME_SHORT, 'PetCare');
  });
});
