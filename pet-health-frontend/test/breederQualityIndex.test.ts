import test from 'node:test';
import assert from 'node:assert/strict';
import type { BreederProfile, PetFeedPost } from '../src/types.ts';
import {
  computeBreederQualityIndex,
  computeListingQualityScore,
  effectiveTrustScore,
  getActiveBreederViolations,
  isHomeBreederEligible,
  rankBreedersWithHomeQuota,
} from '../src/utils/breederQualityIndex.ts';
import {
  healthEvidenceUrlsFromMetadata,
  vaccineStatusRequiresHealthEvidence,
} from '../src/utils/petFeedHealthEvidence.ts';

function profile(partial: Partial<BreederProfile> & Pick<BreederProfile, 'id' | 'user_id'>): BreederProfile {
  return {
    display_name: 'Breeder',
    bio: '',
    location: '',
    avatar_url: null,
    contact: {},
    primary_species: [],
    main_breeds: [],
    verification_status: 'verified',
    metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

function post(partial: Partial<PetFeedPost> & Pick<PetFeedPost, 'id' | 'user_id'>): PetFeedPost {
  return {
    breeder_profile_id: null,
    title: 'Listing',
    species: 'cat',
    breed: 'Persian',
    gender: 'male',
    age_months: 3,
    location: 'Hà Nội',
    price_note: '5tr',
    description: 'A detailed description of this healthy kitten for a new home.',
    personality: [],
    vaccine_status: 'unknown',
    deworming_status: 'unknown',
    paperwork: [],
    media_urls: ['https://example.com/a.jpg'],
    video_url: 'https://example.com/a.mp4',
    contact: {},
    status: 'published',
    post_kind: 'listing',
    metadata: {},
    breeder_profile: null,
    is_favorited: false,
    created_at: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

test('vaccineStatusRequiresHealthEvidence skips unknown and not-yet', () => {
  assert.equal(vaccineStatusRequiresHealthEvidence('unknown'), false);
  assert.equal(vaccineStatusRequiresHealthEvidence('Not vaccinated yet'), false);
  assert.equal(vaccineStatusRequiresHealthEvidence('Chưa tiêm'), false);
  assert.equal(vaccineStatusRequiresHealthEvidence('Basic vaccines completed'), true);
  assert.equal(vaccineStatusRequiresHealthEvidence('Đã tiêm mũi cơ bản'), true);
});

test('healthEvidenceUrlsFromMetadata reads string urls only', () => {
  assert.deepEqual(healthEvidenceUrlsFromMetadata(undefined), []);
  assert.deepEqual(
    healthEvidenceUrlsFromMetadata({ health_evidence_urls: ['https://a', '', 1 as unknown as string] }),
    ['https://a'],
  );
});

test('computeListingQualityScore rewards media and vaccine claim', () => {
  const thin = computeListingQualityScore([
    post({ id: '1', user_id: 'u1', description: 'short', media_urls: [], video_url: null, breed: '', age_months: null }),
  ]);
  const rich = computeListingQualityScore([
    post({
      id: '2',
      user_id: 'u1',
      media_urls: ['a', 'b', 'c'],
      vaccine_status: 'Basic vaccines completed',
      paperwork: ['Vaccine book'],
    }),
  ]);
  assert.ok(rich > thin);
});

test('rankBreedersWithHomeQuota prefers quality over raw post count and applies home quota', () => {
  const now = Date.parse('2026-07-01T00:00:00.000Z');
  const farm = profile({
    id: 'farm',
    user_id: 'farm-user',
    contact: { phone: '0900000001' },
    bio: 'Large commercial farm bio',
    care_environment: 'Dedicated kennel',
    metadata: {
      breederType: 'commercial',
      careChecklist: ['a', 'b', 'c'],
      transparencyCommitments: ['x', 'y'],
    },
    location: 'Hà Nội',
    primary_species: ['cat'],
  });
  const home = profile({
    id: 'home',
    user_id: 'home-user',
    contact: { phone: '0900000002' },
    bio: 'Home breeder',
    care_environment: 'Indoor home',
    metadata: {
      breederType: 'home_breeder',
      scaleRange: '1_3',
      careChecklist: ['a', 'b', 'c'],
      transparencyCommitments: ['x', 'y'],
    },
    location: 'Hà Nội',
    primary_species: ['cat'],
  });

  const farmPosts = [
    post({ id: 'f1', user_id: 'farm-user', created_at: '2026-06-20T00:00:00.000Z' }),
    post({ id: 'f2', user_id: 'farm-user', created_at: '2026-06-21T00:00:00.000Z' }),
    post({ id: 'f3', user_id: 'farm-user', created_at: '2026-06-22T00:00:00.000Z' }),
    post({ id: 'f4', user_id: 'farm-user', created_at: '2026-06-23T00:00:00.000Z' }),
  ];
  const homePosts = [
    post({
      id: 'h1',
      user_id: 'home-user',
      created_at: '2026-06-28T00:00:00.000Z',
      media_urls: ['a', 'b', 'c'],
      vaccine_status: 'Basic vaccines completed',
      paperwork: ['Vaccine book'],
      description: 'Very detailed home listing with care notes for new families.',
    }),
  ];

  const ranked = rankBreedersWithHomeQuota(
    [
      {
        profile: farm,
        posts: farmPosts,
        latestPostAt: Date.parse('2026-06-23T00:00:00.000Z'),
        postCount: farmPosts.length,
      },
      {
        profile: home,
        posts: homePosts,
        latestPostAt: Date.parse('2026-06-28T00:00:00.000Z'),
        postCount: homePosts.length,
      },
      {
        profile: profile({
          id: 'other',
          user_id: 'other-user',
          contact: { phone: '0900000003' },
          metadata: { careChecklist: ['a', 'b', 'c'], transparencyCommitments: ['x', 'y'] },
          care_environment: 'Yard',
          bio: 'Other',
          location: 'Đà Nẵng',
          primary_species: ['dog'],
        }),
        posts: [post({ id: 'o1', user_id: 'other-user', created_at: '2026-06-10T00:00:00.000Z' })],
        latestPostAt: Date.parse('2026-06-10T00:00:00.000Z'),
        postCount: 1,
      },
      {
        profile: profile({
          id: 'other2',
          user_id: 'other2-user',
          contact: { phone: '0900000004' },
          metadata: { careChecklist: ['a', 'b', 'c'], transparencyCommitments: ['x', 'y'] },
          care_environment: 'Yard',
          bio: 'Other2',
          location: 'Huế',
          primary_species: ['dog'],
        }),
        posts: [post({ id: 'o2', user_id: 'other2-user', created_at: '2026-06-11T00:00:00.000Z' })],
        latestPostAt: Date.parse('2026-06-11T00:00:00.000Z'),
        postCount: 1,
      },
    ],
    now,
  );

  assert.equal(ranked.length, 4);
  assert.ok(ranked.some((item) => item.profile.id === 'home'));
  // With 4 slots, quota is 1 home slot — home should appear in the ranked list even with fewer posts.
  const homeIndex = ranked.findIndex((item) => item.profile.id === 'home');
  assert.ok(homeIndex >= 0 && homeIndex <= 1);

  const farmQi = computeBreederQualityIndex(farm, farmPosts, Date.parse('2026-06-23T00:00:00.000Z'), now).qualityIndex;
  const homeQi = computeBreederQualityIndex(home, homePosts, Date.parse('2026-06-28T00:00:00.000Z'), now).qualityIndex;
  assert.ok(homeQi >= farmQi || homeIndex === 0);
});

test('isHomeBreederEligible requires trust and home breeder type', () => {
  assert.equal(
    isHomeBreederEligible(profile({ id: 'a', user_id: 'a', metadata: { breederType: 'home_breeder' } }), 39),
    false,
  );
  assert.equal(
    isHomeBreederEligible(profile({ id: 'a', user_id: 'a', metadata: { breederType: 'home_breeder' } }), 40),
    true,
  );
  assert.equal(
    isHomeBreederEligible(profile({ id: 'a', user_id: 'a', metadata: { scaleRange: '1_3' } }), 50),
    false,
  );
});

test('effectiveTrustScore subtracts penalty points and lists active violations', () => {
  const withPenalty = profile({
    id: 'p',
    user_id: 'p',
    contact: { phone: '090' },
    care_environment: 'Home',
    bio: 'Bio',
    metadata: {
      careChecklist: ['a', 'b', 'c'],
      transparencyCommitments: ['x', 'y'],
      penaltyPoints: 10,
      violations: [
        { id: 'v1', reason: 'misleading', points: 10, createdAt: '2026-07-01T00:00:00.000Z', status: 'active' },
        { id: 'v2', reason: 'spam', points: 5, createdAt: '2026-07-02T00:00:00.000Z', status: 'cleared' },
      ],
    },
  });
  const base = profile({
    id: 'p2',
    user_id: 'p2',
    contact: { phone: '090' },
    care_environment: 'Home',
    bio: 'Bio',
    metadata: {
      careChecklist: ['a', 'b', 'c'],
      transparencyCommitments: ['x', 'y'],
    },
  });
  const posts = [post({ id: '1', user_id: 'p' })];
  assert.equal(getActiveBreederViolations(withPenalty).length, 1);
  assert.ok(effectiveTrustScore(withPenalty, posts) <= effectiveTrustScore(base, posts));
  assert.equal(effectiveTrustScore(withPenalty, posts), Math.max(0, effectiveTrustScore(base, posts) - 10));
});
