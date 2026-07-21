-- Pet Feed in-app messaging (run in Supabase SQL Editor on existing projects).

create table if not exists public.pet_feed_conversations (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.pet_feed_posts(id) on delete cascade,
  sen_user_id text not null,
  breeder_user_id text not null,
  last_message_at timestamptz,
  last_message_preview text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, sen_user_id)
);

create table if not exists public.pet_feed_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.pet_feed_conversations(id) on delete cascade,
  sender_user_id text not null,
  body text not null check (char_length(trim(body)) >= 1),
  created_at timestamptz not null default now()
);

create index if not exists idx_pet_feed_conversations_sen
  on public.pet_feed_conversations(sen_user_id, last_message_at desc nulls last, updated_at desc);

create index if not exists idx_pet_feed_conversations_breeder
  on public.pet_feed_conversations(breeder_user_id, last_message_at desc nulls last, updated_at desc);

create index if not exists idx_pet_feed_messages_conversation_created
  on public.pet_feed_messages(conversation_id, created_at asc);

alter table public.pet_feed_conversations enable row level security;
alter table public.pet_feed_messages enable row level security;

drop policy if exists "pet_feed_conversations_select_participant" on public.pet_feed_conversations;
drop policy if exists "pet_feed_conversations_insert_sen" on public.pet_feed_conversations;
drop policy if exists "pet_feed_messages_select_participant" on public.pet_feed_messages;
drop policy if exists "pet_feed_messages_insert_participant" on public.pet_feed_messages;

create policy "pet_feed_conversations_select_participant"
on public.pet_feed_conversations for select
to authenticated
using (auth.uid()::text = sen_user_id or auth.uid()::text = breeder_user_id);

create policy "pet_feed_conversations_insert_sen"
on public.pet_feed_conversations for insert
to authenticated
with check (
  auth.uid()::text = sen_user_id
  and exists (
    select 1 from public.pet_feed_posts p
    where p.id = post_id
      and p.status = 'published'
      and p.user_id = breeder_user_id
  )
);

create policy "pet_feed_messages_select_participant"
on public.pet_feed_messages for select
to authenticated
using (
  exists (
    select 1 from public.pet_feed_conversations c
    where c.id = conversation_id
      and (c.sen_user_id = auth.uid()::text or c.breeder_user_id = auth.uid()::text)
  )
);

create policy "pet_feed_messages_insert_participant"
on public.pet_feed_messages for insert
to authenticated
with check (
  auth.uid()::text = sender_user_id
  and exists (
    select 1 from public.pet_feed_conversations c
    where c.id = conversation_id
      and (c.sen_user_id = auth.uid()::text or c.breeder_user_id = auth.uid()::text)
  )
);
