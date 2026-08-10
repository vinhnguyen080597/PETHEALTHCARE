-- Allow comment + conversation engagement on soft-deposit listings.
-- Previously RLS required pet_feed_posts.status = 'published' only, which
-- caused INTERNAL_ERROR (RLS violation) when Sen commented on deposit_hold.

drop policy if exists "pet_feed_comments_select_visible" on public.pet_feed_comments;
drop policy if exists "pet_feed_comments_insert_own" on public.pet_feed_comments;
drop policy if exists "pet_feed_conversations_insert_sen" on public.pet_feed_conversations;

create policy "pet_feed_comments_select_visible"
on public.pet_feed_comments for select
to authenticated
using (
  exists (
    select 1 from public.pet_feed_posts p
    where p.id = post_id
      and (
        p.status in ('published', 'deposit_hold', 'sold')
        or p.user_id = auth.uid()::text
        or (
          p.status = 'archived'
          and coalesce(p.metadata->>'soft_status', '') in ('deposit_hold', 'sold')
        )
      )
  )
);

create policy "pet_feed_comments_insert_own"
on public.pet_feed_comments for insert
to authenticated
with check (
  auth.uid()::text = user_id
  and exists (
    select 1 from public.pet_feed_posts p
    where p.id = post_id
      and (
        p.status in ('published', 'deposit_hold')
        or (
          p.status = 'archived'
          and coalesce(p.metadata->>'soft_status', '') = 'deposit_hold'
        )
      )
  )
);

create policy "pet_feed_conversations_insert_sen"
on public.pet_feed_conversations for insert
to authenticated
with check (
  auth.uid()::text = sen_user_id
  and exists (
    select 1 from public.pet_feed_posts p
    where p.id = post_id
      and p.user_id = breeder_user_id
      and (
        p.status in ('published', 'deposit_hold')
        or (
          p.status = 'archived'
          and coalesce(p.metadata->>'soft_status', '') = 'deposit_hold'
        )
      )
  )
);
