-- Farm reviews require admin approval before affecting public ratings.

alter table public.breeder_farm_reviews
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists rejection_reason text not null default '',
  add column if not exists admin_note text not null default '',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text;

-- Existing reviews were live before moderation — keep them visible.
update public.breeder_farm_reviews
set status = 'approved'
where status = 'pending';

drop index if exists idx_breeder_farm_reviews_primary_unique;
drop index if exists idx_breeder_farm_reviews_sale_unique;

create unique index if not exists idx_breeder_farm_reviews_primary_active
  on public.breeder_farm_reviews(breeder_profile_id, reviewer_user_id)
  where kind = 'primary' and status in ('pending', 'approved');

create unique index if not exists idx_breeder_farm_reviews_sale_active
  on public.breeder_farm_reviews(post_id, reviewer_user_id)
  where kind = 'sale' and status in ('pending', 'approved');

create index if not exists idx_breeder_farm_reviews_status_created
  on public.breeder_farm_reviews(status, created_at desc);
