-- Pet Feed post comments (run in Supabase SQL Editor on existing projects).

create table if not exists public.pet_feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.pet_feed_posts(id) on delete cascade,
  user_id text not null,
  body text not null check (char_length(trim(body)) >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pet_feed_comments_post_created
  on public.pet_feed_comments(post_id, created_at asc);

alter table public.pet_feed_comments enable row level security;

drop policy if exists "pet_feed_comments_select_visible" on public.pet_feed_comments;
drop policy if exists "pet_feed_comments_insert_own" on public.pet_feed_comments;
drop policy if exists "pet_feed_comments_delete_own" on public.pet_feed_comments;

create policy "pet_feed_comments_select_visible"
on public.pet_feed_comments for select
to authenticated
using (
  exists (
    select 1 from public.pet_feed_posts p
    where p.id = post_id
      and (p.status = 'published' or p.user_id = auth.uid()::text)
  )
);

create policy "pet_feed_comments_insert_own"
on public.pet_feed_comments for insert
to authenticated
with check (
  auth.uid()::text = user_id
  and exists (
    select 1 from public.pet_feed_posts p
    where p.id = post_id and p.status = 'published'
  )
);

create policy "pet_feed_comments_delete_own"
on public.pet_feed_comments for delete
to authenticated
using (auth.uid()::text = user_id);
