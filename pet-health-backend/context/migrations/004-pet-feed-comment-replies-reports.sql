-- Pet Feed comments: replies (1-level), comment reports (run in Supabase SQL Editor).

alter table public.pet_feed_comments
  add column if not exists parent_id uuid references public.pet_feed_comments(id) on delete cascade;

create index if not exists idx_pet_feed_comments_parent_created
  on public.pet_feed_comments(parent_id, created_at asc);

alter table public.pet_feed_reports
  add column if not exists comment_id uuid references public.pet_feed_comments(id) on delete cascade;

alter table public.pet_feed_reports drop constraint if exists pet_feed_reports_target_type_check;
alter table public.pet_feed_reports
  add constraint pet_feed_reports_target_type_check
  check (target_type in ('post', 'breeder_profile', 'comment'));

alter table public.pet_feed_reports drop constraint if exists pet_feed_reports_target_required_check;
alter table public.pet_feed_reports
  add constraint pet_feed_reports_target_required_check
  check (
    (target_type = 'post' and post_id is not null and breeder_profile_id is null and comment_id is null)
    or (target_type = 'breeder_profile' and breeder_profile_id is not null and post_id is null and comment_id is null)
    or (target_type = 'comment' and comment_id is not null and post_id is not null and breeder_profile_id is null)
  );

create index if not exists idx_pet_feed_reports_comment
  on public.pet_feed_reports(comment_id);
