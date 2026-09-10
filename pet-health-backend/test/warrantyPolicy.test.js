import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveListingWarrantyPolicy } from '../src/utils/warrantyPolicy.js';

const filePolicy = {
  id: 'wp-file',
  title: 'Chính sách trại',
  file_url: 'https://cdn.example/policy.pdf',
  content_type: 'application/pdf',
  vaccine_shots_count: 2,
  care_parvo_coverage_days: 14,
  respiratory_skin_coverage_days: 3,
  congenital_coverage_days: 30,
  report_within_hours: 24,
  medical_fee_support_percent: 50,
  breeder_response_hours: 24,
};

test('resolveListingWarrantyPolicy uses bound copy when library metadata is missing', () => {
  const resolved = resolveListingWarrantyPolicy(
    {
      status: 'published',
      metadata: {
        warranty_policy_id: 'wp-file',
        warranty_policy_bound: filePolicy,
      },
    },
    {},
  );
  assert.equal(resolved.id, 'wp-file');
  assert.equal(resolved.file_url, 'https://cdn.example/policy.pdf');
  assert.equal(resolved.frozen, false);
});

test('resolveListingWarrantyPolicy keeps the listing bound file over a different library file', () => {
  const resolved = resolveListingWarrantyPolicy(
    {
      status: 'published',
      metadata: {
        warranty_policy_id: 'wp-file',
        warranty_policy_bound: { ...filePolicy, file_url: 'https://cdn.example/listing.pdf' },
      },
    },
    { warranty_policies: [{ ...filePolicy, file_url: 'https://cdn.example/library.pdf' }] },
  );
  assert.equal(resolved.file_url, 'https://cdn.example/listing.pdf');
});

test('resolveListingWarrantyPolicy fills a bound copy from the library when the bound file is missing', () => {
  const resolved = resolveListingWarrantyPolicy(
    {
      status: 'published',
      metadata: {
        warranty_policy_id: 'wp-file',
        warranty_policy_bound: { ...filePolicy, file_url: '' },
      },
    },
    { warranty_policies: [filePolicy] },
  );
  assert.equal(resolved.file_url, 'https://cdn.example/policy.pdf');
});

test('resolveListingWarrantyPolicy uses the farm file when listing policy has form defaults only', () => {
  const resolved = resolveListingWarrantyPolicy(
    {
      status: 'published',
      metadata: {
        warranty_policy_id: 'wp-form',
        warranty_policy_bound: {
          id: 'wp-form',
          title: 'Trung Vinh',
          vaccine_shots_count: 2,
          care_parvo_coverage_days: 14,
        },
      },
    },
    {
      warranty_policies: [
        { ...filePolicy, id: 'wp-upload', title: 'Trung Vinh', file_url: 'https://cdn.example/farm.pdf' },
      ],
    },
  );
  assert.equal(resolved.file_url, 'https://cdn.example/farm.pdf');
});
