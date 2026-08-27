import test from 'node:test';
import assert from 'node:assert/strict';
import {
  breederActivityCue,
  breederCardHasPetPreview,
  breederCardPetsPreviewTitleKey,
  breederCardShowsSoldCount,
  breederCardSpecialtyLabel,
  buildBreederPetThumbs,
  canShowBreederMessageAction,
  shortPetPriceLabel,
} from '../src/utils/breederDirectoryCard.ts';
import type { BreederProfile, PetFeedPost } from '../src/types.ts';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import vi from '../src/i18n/locales/vi.json' with { type: 'json' };

function profile(partial: Partial<BreederProfile> = {}): BreederProfile {
  return {
    id: 'b1',
    user_id: 'u1',
    display_name: 'Lucastalina',
    bio: '',
    location: 'Hà Nội',
    avatar_url: null,
    contact: {},
    primary_species: ['cat'],
    main_breeds: [],
    verification_status: 'verified',
    metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

function post(partial: Partial<PetFeedPost> & Pick<PetFeedPost, 'id' | 'status'>): PetFeedPost {
  return {
    user_id: 'u1',
    breeder_profile_id: 'b1',
    title: 'Kitten',
    species: 'cat',
    breed: 'British',
    gender: 'female',
    age_months: 3,
    location: 'Hà Nội',
    price_note: '333000 VND',
    description: '',
    personality: [],
    vaccine_status: '',
    deworming_status: '',
    paperwork: [],
    media_urls: ['https://cdn.example/pet.jpg'],
    video_url: null,
    contact: {},
    metadata: {},
    breeder_profile: null,
    is_favorited: false,
    created_at: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

test('breederCardSpecialtyLabel prefers breeds then species', () => {
  assert.equal(
    breederCardSpecialtyLabel(profile({ primary_species: ['cat'] }), 'vi'),
    '🐱 Chuyên: Mèo',
  );
  assert.equal(
    breederCardSpecialtyLabel(
      profile({ primary_species: ['dog'], main_breeds: ['Poodle', 'Corgi'] }),
      'en',
    ),
    '🐶 Specialty: Poodle • Corgi',
  );
});

test('shortPetPriceLabel matches web compact prices', () => {
  assert.equal(shortPetPriceLabel('333000 VND'), '333k');
  assert.equal(shortPetPriceLabel('1500000 VND'), '1.5M');
  assert.equal(shortPetPriceLabel(''), '');
});

test('activity cue never invents online without signal', () => {
  assert.equal(breederActivityCue({ trustScore: 10, reviewCount: 0, activeListings: 0 }).kind, 'none');
  assert.equal(
    breederActivityCue({ trustScore: 50, reviewCount: 0, activeListings: 1 }).kind,
    'active_kennel',
  );
  assert.equal(
    breederActivityCue({ trustScore: 80, reviewCount: 3, activeListings: 1 }).kind,
    'fast_response',
  );
  assert.equal(
    breederActivityCue({
      trustScore: 10,
      reviewCount: 0,
      activeListings: 0,
      responseHours: 1,
    }).kind,
    'fast_response',
  );
});

test('pet thumbs only include for-sale listings with media', () => {
  const thumbs = buildBreederPetThumbs([
    post({ id: 'p1', status: 'published' }),
    post({ id: 'p2', status: 'sold', media_urls: ['https://cdn.example/sold.jpg'] }),
    post({ id: 'p3', status: 'published', media_urls: [] }),
  ]);
  assert.equal(thumbs.length, 1);
  assert.equal(thumbs[0]?.listingId, 'p1');
  assert.equal(breederCardHasPetPreview(thumbs.length), true);
  assert.equal(breederCardPetsPreviewTitleKey(0), 'petFeed.breedersCard.petsPreviewEmpty');
  assert.equal(breederCardPetsPreviewTitleKey(2), 'petFeed.breedersCard.petsPreviewCount');
});

test('sold count and message gate helpers', () => {
  assert.equal(breederCardShowsSoldCount(0), false);
  assert.equal(breederCardShowsSoldCount(4), true);
  assert.equal(canShowBreederMessageAction(null, 'u1'), false);
  assert.equal(canShowBreederMessageAction('u1', 'u1'), false);
  assert.equal(canShowBreederMessageAction('sen', 'u1'), true);
});

test('breedersCard i18n EN/VI parity', () => {
  const keys = [
    'reviews',
    'sold',
    'trustIndex',
    'cta',
    'fastResponse',
    'activeKennel',
    'petsPreviewCount',
    'petsPreviewEmpty',
    'message',
  ] as const;
  for (const key of keys) {
    assert.ok(en.petFeed.breedersCard[key], `en missing ${key}`);
    assert.ok(vi.petFeed.breedersCard[key], `vi missing ${key}`);
  }
  assert.equal(vi.petFeed.breedersCard.cta, 'Ghé Trại Giống');
  assert.equal(vi.petFeed.breedersCard.activeKennel, 'Trực tuyến');
  assert.equal(vi.petFeed.breedersCard.message, 'Nhắn tin');
});
