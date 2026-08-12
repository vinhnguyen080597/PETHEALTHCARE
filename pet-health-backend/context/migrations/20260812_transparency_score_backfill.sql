-- Phase 5: drop obsolete stored trust scores / eKYC flags.
-- Live transparency score is computed from verification_status (+ approved signals):
-- verified breeders start at 30; unverified stay at 0.

UPDATE public.breeder_profiles
SET metadata = COALESCE(metadata, '{}'::jsonb)
  - 'trust_score'
  - 'trustScore'
  - 'transparency_score'
  - 'has_ekyc'
  - 'ekyc_verified'
  - 'ekyc'
  - 'has_health_docs'
  - 'health_docs_verified'
WHERE metadata ?| array[
  'trust_score',
  'trustScore',
  'transparency_score',
  'has_ekyc',
  'ekyc_verified',
  'ekyc',
  'has_health_docs',
  'health_docs_verified'
];
