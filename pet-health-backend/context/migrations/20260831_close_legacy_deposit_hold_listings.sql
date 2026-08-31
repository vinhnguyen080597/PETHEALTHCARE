-- Close legacy escrow/deposit_hold listings after platform removed in-app deal flow.
-- Completed deals stay sold; active holds return to published for sale.

update public.pet_feed_posts
set
  status = case
    when lower(coalesce(metadata->'deal'->>'status', '')) = 'completed'
      or metadata->>'listing_outcome' = 'sold'
      or coalesce(metadata->>'sold', 'false') = 'true'
      then 'sold'
    else 'published'
  end,
  metadata = (
    coalesce(metadata, '{}'::jsonb)
    - 'soft_deposit_hold'
    - 'soft_status'
  ) || jsonb_build_object(
    'deal',
    coalesce(metadata->'deal', '{}'::jsonb) || jsonb_build_object(
      'status', 'closed_legacy',
      'closed_at', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'closed_reason', 'escrow_feature_removed'
    )
  ),
  updated_at = timezone('utc', now())
where status = 'deposit_hold'
   or metadata->>'soft_status' = 'deposit_hold';
