-- Allow uploaded warranty policies to enter breeder detail review queue.

alter table public.breeder_profile_submissions
  drop constraint if exists breeder_profile_submissions_submission_type_check;

alter table public.breeder_profile_submissions
  add constraint breeder_profile_submissions_submission_type_check
  check (submission_type in (
    'facility_video',
    'business_license',
    'warranty_policy_file',
    'social_facebook',
    'social_zalo',
    'social_tiktok',
    'social_instagram'
  ));
