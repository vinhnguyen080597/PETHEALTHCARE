-- Farm reviews: direct primary/supplement + in-platform sale reviews (replaces deal-flow reviews).

create table if not exists public.breeder_farm_reviews (
  id uuid primary key default gen_random_uuid(),
  breeder_profile_id uuid not null references public.breeder_profiles(id) on delete cascade,
  reviewer_user_id text not null,
  kind text not null check (kind in ('primary', 'supplement', 'sale')),
  parent_review_id uuid references public.breeder_farm_reviews(id) on delete cascade,
  post_id uuid references public.pet_feed_posts(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  body text not null default '',
  photo_urls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint breeder_farm_reviews_sale_requires_post
    check (kind <> 'sale' or post_id is not null),
  constraint breeder_farm_reviews_supplement_requires_parent
    check (kind <> 'supplement' or parent_review_id is not null)
);

create unique index if not exists idx_breeder_farm_reviews_primary_unique
  on public.breeder_farm_reviews(breeder_profile_id, reviewer_user_id)
  where kind = 'primary';

create unique index if not exists idx_breeder_farm_reviews_sale_unique
  on public.breeder_farm_reviews(post_id, reviewer_user_id)
  where kind = 'sale';

create index if not exists idx_breeder_farm_reviews_breeder_created
  on public.breeder_farm_reviews(breeder_profile_id, created_at desc);

create index if not exists idx_breeder_farm_reviews_parent
  on public.breeder_farm_reviews(parent_review_id);

alter table public.breeder_farm_reviews enable row level security;

drop policy if exists "breeder_farm_reviews_select_public" on public.breeder_farm_reviews;
drop policy if exists "breeder_farm_reviews_insert_own" on public.breeder_farm_reviews;

create policy "breeder_farm_reviews_select_public"
on public.breeder_farm_reviews for select
to authenticated
using (true);

create policy "breeder_farm_reviews_insert_own"
on public.breeder_farm_reviews for insert
to authenticated
with check (auth.uid()::text = reviewer_user_id);
