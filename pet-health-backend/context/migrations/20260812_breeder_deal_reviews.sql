-- Sen reviews after confirmed handoff (+ transparency score activity).

create table if not exists public.breeder_deal_reviews (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.pet_feed_posts(id) on delete cascade,
  sen_user_id text not null,
  breeder_profile_id uuid not null references public.breeder_profiles(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  body text not null default '',
  created_at timestamptz not null default now(),
  unique (post_id, sen_user_id)
);

create index if not exists idx_breeder_deal_reviews_breeder_created
  on public.breeder_deal_reviews(breeder_profile_id, created_at desc);

create index if not exists idx_breeder_deal_reviews_post
  on public.breeder_deal_reviews(post_id);

alter table public.breeder_deal_reviews enable row level security;

drop policy if exists "breeder_deal_reviews_select_public" on public.breeder_deal_reviews;
drop policy if exists "breeder_deal_reviews_insert_own" on public.breeder_deal_reviews;

create policy "breeder_deal_reviews_select_public"
on public.breeder_deal_reviews for select
to authenticated
using (true);

create policy "breeder_deal_reviews_insert_own"
on public.breeder_deal_reviews for insert
to authenticated
with check (auth.uid()::text = sen_user_id);
