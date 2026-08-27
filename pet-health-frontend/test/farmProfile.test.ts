import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countFarmPetsByAvailability,
  farmPetAvailability,
  farmPetTabCount,
  filterFarmPetsByAvailability,
} from '../src/utils/farmPets.ts';
import {
  farmFacilityHasContent,
  farmFacilitySocialLinks,
  maskZaloPublicDisplay,
} from '../src/utils/farmFacility.ts';
import {
  farmImageSource,
  farmTabLabelKey,
  farmWarrantyPoliciesFromMetadata,
  isBlankImageUrl,
  resolveFarmAvatarUrl,
  resolveFarmCoverUrl,
} from '../src/utils/farmProfileDisplay.ts';
import {
  applyFarmPhotoToProfile,
  farmPhotoPickerAspect,
  farmPhotoResizeWidth,
  isFarmPhotoKind,
  isUnusableFarmPhotoUrl,
} from '../src/utils/farmPhotos.ts';
import {
  farmTransparencyMeaning,
  farmTrustLevelChipLabel,
} from '../src/utils/farmTrustDisplay.ts';
import { farmChatErrorKey } from '../src/utils/farmChat.ts';
import { transparencyTickColor } from '../src/utils/breederTransparencyScore.ts';
import type { PetFeedPost } from '../src/types.ts';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import vi from '../src/i18n/locales/vi.json' with { type: 'json' };

function post(partial: Partial<PetFeedPost> & Pick<PetFeedPost, 'id' | 'status'>): PetFeedPost {
  return {
    user_id: 'u1',
    breeder_profile_id: 'b1',
    title: 'Pet',
    species: 'cat',
    breed: '',
    gender: '',
    age_months: null,
    location: '',
    price_note: '',
    description: '',
    personality: [],
    vaccine_status: '',
    deworming_status: '',
    paperwork: [],
    media_urls: [],
    video_url: null,
    contact: {},
    metadata: {},
    breeder_profile: null,
    is_favorited: false,
    created_at: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

test('farmPetAvailability maps published / deposit / sold', () => {
  assert.equal(farmPetAvailability(post({ id: '1', status: 'published' })), 'for_sale');
  assert.equal(farmPetAvailability(post({ id: '2', status: 'deposit_hold' })), 'deposit_hold');
  assert.equal(farmPetAvailability(post({ id: '3', status: 'sold' })), 'completed');
  assert.equal(farmPetAvailability(post({ id: '4', status: 'draft' })), null);
});

test('farm pets count and filter', () => {
  const posts = [
    post({ id: '1', status: 'published' }),
    post({ id: '2', status: 'deposit_hold' }),
    post({ id: '3', status: 'sold' }),
    post({ id: '4', status: 'draft' }),
  ];
  assert.equal(farmPetTabCount(posts), 3);
  assert.deepEqual(countFarmPetsByAvailability(posts), {
    for_sale: 1,
    deposit_hold: 1,
    completed: 1,
  });
  assert.equal(filterFarmPetsByAvailability(posts, 'for_sale').map((p) => p.id).join(','), '1');
});

test('farmFacilitySocialLinks masks Zalo and keeps https socials', () => {
  const links = farmFacilitySocialLinks({
    zalo: '0901234567',
    facebook: 'https://facebook.com/catties',
    tiktok: 'not-a-url',
  });
  assert.equal(links.length, 2);
  assert.equal(links[0].id, 'facebook');
  assert.equal(links[1].display, '090***567');
  assert.equal(maskZaloPublicDisplay('84901234567'), '090***567');
  assert.equal(farmFacilityHasContent({ bio: 'Hello', socialCount: 0 }), true);
  assert.equal(farmFacilityHasContent({ bio: '', socialCount: 0, videoUrl: null }), false);
});

test('farm profile display helpers', () => {
  assert.equal(farmTabLabelKey('listings'), 'farm.tab.listings');
  const warranties = farmWarrantyPoliciesFromMetadata({
    warranty_policies: [{ id: 'w1', title: '30 ngày' }, { title: '' }],
  });
  assert.equal(warranties.length, 1);
  assert.equal(warranties[0].id, 'w1');
  assert.equal(warranties[0].title, '30 ngày');
  assert.equal(
    resolveFarmCoverUrl({
      id: 'b1',
      user_id: 'u1',
      display_name: 'Farm',
      bio: '',
      location: '',
      avatar_url: null,
      contact: {},
      primary_species: [],
      main_breeds: [],
      verification_status: 'verified',
      metadata: { coverUrl: 'https://cdn.example/cover.jpg' },
      created_at: '2026-01-01',
    }),
    'https://cdn.example/cover.jpg',
  );
  assert.equal(
    resolveFarmAvatarUrl({
      id: 'b1',
      user_id: 'u1',
      display_name: 'Farm',
      bio: '',
      location: '',
      avatar_url: 'https://cdn.example/avatar.jpg',
      contact: {},
      primary_species: [],
      main_breeds: [],
      verification_status: 'verified',
      metadata: {},
      created_at: '2026-01-01',
    }),
    'https://cdn.example/avatar.jpg',
  );
});

test('farm default photos fall back when missing or legacy unsplash', () => {
  const base = {
    id: 'b1',
    user_id: 'u1',
    display_name: 'Farm',
    bio: '',
    location: '',
    avatar_url: null as string | null,
    contact: {},
    primary_species: [] as string[],
    main_breeds: [] as string[],
    verification_status: 'verified' as const,
    metadata: {},
    created_at: '2026-01-01',
  };
  const fallback = { uri: 'bundled-default' };
  assert.equal(resolveFarmCoverUrl(base), null);
  assert.equal(resolveFarmAvatarUrl(base), null);
  assert.deepEqual(farmImageSource(null, fallback), fallback);
  assert.deepEqual(farmImageSource('https://cdn.example/cover.jpg', fallback), {
    uri: 'https://cdn.example/cover.jpg',
  });
  assert.equal(isBlankImageUrl(''), true);
  assert.equal(isBlankImageUrl('data:image/svg+xml,%3Csvg'), true);
  assert.equal(
    isBlankImageUrl('https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=1600'),
    true,
  );
  assert.equal(
    resolveFarmCoverUrl({
      ...base,
      metadata: { coverUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=1600' },
    }),
    null,
  );
});

test('farm photo helpers apply avatar and cover updates', () => {
  assert.equal(isFarmPhotoKind('avatar'), true);
  assert.equal(isFarmPhotoKind('bio'), false);
  assert.deepEqual(farmPhotoPickerAspect('avatar'), [1, 1]);
  assert.deepEqual(farmPhotoPickerAspect('cover'), [16, 9]);
  assert.equal(farmPhotoResizeWidth('avatar'), 512);
  assert.equal(farmPhotoResizeWidth('cover'), 1600);
  assert.equal(isUnusableFarmPhotoUrl('memory://x'), true);
  assert.equal(isUnusableFarmPhotoUrl('https://cdn.example/a.jpg'), false);
  const base = {
    id: 'b1',
    user_id: 'u1',
    display_name: 'Farm',
    bio: '',
    location: '',
    avatar_url: null as string | null,
    contact: {},
    primary_species: [] as string[],
    main_breeds: [] as string[],
    verification_status: 'verified' as const,
    metadata: { note: 'keep' },
    created_at: '2026-01-01',
  };
  assert.equal(
    applyFarmPhotoToProfile(base, 'avatar', 'https://cdn.example/a.jpg').avatar_url,
    'https://cdn.example/a.jpg',
  );
  const withCover = applyFarmPhotoToProfile(base, 'cover', 'https://cdn.example/c.jpg');
  assert.equal(withCover.metadata.cover_url, 'https://cdn.example/c.jpg');
  assert.equal(withCover.metadata.coverUrl, 'https://cdn.example/c.jpg');
  assert.equal(withCover.metadata.note, 'keep');
});

test('farm trust display helpers', () => {
  assert.equal(farmTrustLevelChipLabel('L3', 'Trại tiềm năng'), 'L3 • Trại tiềm năng');
  assert.match(farmTransparencyMeaning(50, 'vi'), /uy tín|minh bạch/i);
  assert.match(farmTransparencyMeaning(50, 'en'), /reputation|transparency/i);
  assert.equal(transparencyTickColor(10, 30).startsWith('#'), true);
  assert.equal(transparencyTickColor(80, 30), '#E5E7EB');
});

test('farm tab i18n EN/VI parity', () => {
  assert.equal(vi.farm.tab.overview, 'Tổng quan');
  assert.equal(vi.farm.tab.listings, 'Thú cưng');
  assert.equal(vi.farm.tab.warranty, 'Chính sách bảo hành');
  assert.equal(en.farm.tab.overview, 'Overview');
  assert.equal(en.farm.cta.message.length > 0, true);
  assert.equal(vi.farm.cta.message.length > 0, true);
  assert.equal(en.farm.owner.editCover.length > 0, true);
  assert.equal(vi.farm.owner.editCover.length > 0, true);
  assert.equal(en.farm.owner.editAvatar.length > 0, true);
  assert.equal(vi.farm.owner.editAvatar.length > 0, true);
  assert.equal(vi.farm.trust.title, 'Chỉ số tin cậy');
  assert.equal(en.farm.trust.title, 'Trust metrics');
  assert.equal(vi.farm.trust.gaugeCaption.length > 0, true);
  assert.equal(en.farm.trust.gaugeCaption.length > 0, true);
  assert.equal(vi.farm.trust.guideCta, 'Xem chi tiết điểm & hướng dẫn');
  assert.equal(en.farm.trust.guideCta.length > 0, true);
  assert.equal(vi.farm.trust.guide.ownerOnly, 'Chỉ chủ trại');
  assert.equal(en.farm.trust.guide.ownerOnly, 'Owner only');
  assert.equal(vi.farm.trust.guide.earnTitle.length > 0, true);
  assert.equal(en.farm.trust.guide.earnTitle.length > 0, true);
  assert.equal(vi.farm.trust.scoreLine.includes('{{score}}'), true);
  assert.equal(en.farm.trust.scoreLine.includes('{{score}}'), true);
  assert.equal(vi.farm.trust.responseEmpty.length > 0, true);
  assert.equal(en.farm.trust.responseEmpty.length > 0, true);
  assert.equal(vi.farm.warranty.createButton, 'Tạo chính sách');
  assert.equal(en.farm.warranty.createButton, 'Create policy');
  assert.equal(vi.warranty.viewCta.length > 0, true);
  assert.equal(en.warranty.library.title.length > 0, true);
  assert.equal(vi.warranty.field.careParvo.mixed.length > 0, true);
  assert.equal(en.warranty.evidence.rapid_test_photo.dog.length > 0, true);
});

test('farmChatErrorKey maps backend codes', () => {
  assert.equal(farmChatErrorKey('PET_FEED_MESSAGE_SELF'), 'petFeed.messages.startChatSelf');
  assert.equal(farmChatErrorKey('PET_FEED_NO_LISTING_TO_MESSAGE', 404), 'petFeed.messages.noListingToMessage');
  assert.equal(farmChatErrorKey(undefined, 500), 'petFeed.messages.startChatFailed');
});
