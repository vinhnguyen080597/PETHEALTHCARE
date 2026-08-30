import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDealVisibility,
  canViewerSeeDealPii,
  mergeClientPostMetadata,
  sanitizeDealForViewer,
} from '../src/utils/listingPostSecurity.js';

const samplePost = {
  id: 'post-1',
  user_id: 'breeder-1',
  metadata: {
    deal: {
      status: 'deposit_hold',
      sen_user_id: 'sen-1',
      sen_email: 'sen@example.com',
      sen_display_name: 'Sen Buyer',
    },
  },
};

test('mergeClientPostMetadata strips server-owned keys from client writes', () => {
  const merged = mergeClientPostMetadata(
    {
      health_evidence_urls: ['https://cdn.example/v.jpg'],
      deal: { status: 'deposit_hold', sen_email: 'evil@hack.com' },
      soft_deposit_hold: true,
      sold: true,
    },
    { deal: { status: 'pending_sen' }, warranty_policy_id: 'wp-1' },
  );
  assert.deepEqual(merged.health_evidence_urls, ['https://cdn.example/v.jpg']);
  assert.equal(merged.deal.status, 'pending_sen');
  assert.equal(merged.warranty_policy_id, 'wp-1');
  assert.equal(merged.soft_deposit_hold, undefined);
  assert.equal(merged.sold, undefined);
});

test('sanitizeDealForViewer redacts Sen PII for public viewers', () => {
  const deal = samplePost.metadata.deal;
  const publicDeal = sanitizeDealForViewer(deal, samplePost, null);
  assert.equal(publicDeal.status, 'deposit_hold');
  assert.equal(publicDeal.sen_email, undefined);
  assert.equal(publicDeal.sen_user_id, undefined);
  assert.equal(publicDeal.sen_display_name, undefined);
});

test('sanitizeDealForViewer keeps PII for breeder owner and assigned Sen', () => {
  const deal = samplePost.metadata.deal;
  assert.ok(canViewerSeeDealPii(samplePost, 'breeder-1'));
  assert.ok(canViewerSeeDealPii(samplePost, 'sen-1'));
  assert.equal(sanitizeDealForViewer(deal, samplePost, 'breeder-1').sen_email, 'sen@example.com');
  assert.equal(sanitizeDealForViewer(deal, samplePost, 'sen-1').sen_user_id, 'sen-1');
});

test('applyDealVisibility redacts top-level deal and metadata.deal', () => {
  const dto = applyDealVisibility(
    {
      ...samplePost,
      deal: samplePost.metadata.deal,
    },
    'stranger-1',
  );
  assert.equal(dto.deal.status, 'deposit_hold');
  assert.equal(dto.deal.sen_email, undefined);
  assert.equal(dto.metadata.deal.sen_email, undefined);
});
