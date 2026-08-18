-- One Sen + one farm = one conversation. Listing is optional context (post_id).

alter table public.pet_feed_conversations
  add column if not exists breeder_profile_id uuid references public.breeder_profiles(id) on delete set null;

update public.pet_feed_conversations c
set breeder_profile_id = p.breeder_profile_id
from public.pet_feed_posts p
where c.post_id = p.id
  and c.breeder_profile_id is null;

alter table public.pet_feed_conversations
  alter column post_id drop not null;

alter table public.pet_feed_conversations
  drop constraint if exists pet_feed_conversations_post_id_fkey;

alter table public.pet_feed_conversations
  add constraint pet_feed_conversations_post_id_fkey
  foreign key (post_id) references public.pet_feed_posts(id) on delete set null;

alter table public.pet_feed_conversations
  drop constraint if exists pet_feed_conversations_has_target_check;

alter table public.pet_feed_conversations
  add constraint pet_feed_conversations_has_target_check
  check (post_id is not null or breeder_profile_id is not null);

alter table public.pet_feed_conversations
  drop constraint if exists pet_feed_conversations_post_id_sen_user_id_key;

drop index if exists uq_pet_feed_conversations_direct_breeder_sen;
drop index if exists uq_pet_feed_conversations_breeder_sen;

-- Merge duplicate farm threads before unique (sen, farm).
update public.pet_feed_messages m
set conversation_id = keep.keep_id
from (
  select extra.id as extra_id, keeper.id as keep_id
  from (
    select
      id,
      sen_user_id,
      breeder_profile_id,
      row_number() over (
        partition by sen_user_id, breeder_profile_id
        order by last_message_at desc nulls last, updated_at desc, created_at asc
      ) as rn
    from public.pet_feed_conversations
    where breeder_profile_id is not null
  ) extra
  join (
    select
      id,
      sen_user_id,
      breeder_profile_id,
      row_number() over (
        partition by sen_user_id, breeder_profile_id
        order by last_message_at desc nulls last, updated_at desc, created_at asc
      ) as rn
    from public.pet_feed_conversations
    where breeder_profile_id is not null
  ) keeper
    on keeper.sen_user_id = extra.sen_user_id
   and keeper.breeder_profile_id = extra.breeder_profile_id
   and keeper.rn = 1
  where extra.rn > 1
) keep
where m.conversation_id = keep.extra_id;

delete from public.pet_feed_conversations c
using (
  select id
  from (
    select
      id,
      row_number() over (
        partition by sen_user_id, breeder_profile_id
        order by last_message_at desc nulls last, updated_at desc, created_at asc
      ) as rn
    from public.pet_feed_conversations
    where breeder_profile_id is not null
  ) ranked
  where ranked.rn > 1
) extras
where c.id = extras.id;

create unique index if not exists uq_pet_feed_conversations_breeder_sen
  on public.pet_feed_conversations(breeder_profile_id, sen_user_id)
  where breeder_profile_id is not null;

create index if not exists idx_pet_feed_conversations_breeder_profile
  on public.pet_feed_conversations(breeder_profile_id, last_message_at desc nulls last, updated_at desc);

drop policy if exists "pet_feed_conversations_insert_sen" on public.pet_feed_conversations;

create policy "pet_feed_conversations_insert_sen"
on public.pet_feed_conversations for insert
to authenticated
with check (
  auth.uid()::text = sen_user_id
  and (
    (
      post_id is not null
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
    )
    or (
      post_id is null
      and breeder_profile_id is not null
      and exists (
        select 1 from public.breeder_profiles bp
        where bp.id = breeder_profile_id
          and bp.user_id = breeder_user_id
          and bp.verification_status = 'verified'
      )
    )
  )
);
