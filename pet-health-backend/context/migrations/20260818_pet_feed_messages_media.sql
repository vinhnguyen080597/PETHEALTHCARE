-- Chat attachments (photos / videos) on pet_feed_messages.

alter table public.pet_feed_messages
  add column if not exists media_urls text[] not null default '{}';

alter table public.pet_feed_messages
  alter column body set default '';

alter table public.pet_feed_messages
  drop constraint if exists pet_feed_messages_body_check;

alter table public.pet_feed_messages
  drop constraint if exists pet_feed_messages_body_or_media_check;

alter table public.pet_feed_messages
  add constraint pet_feed_messages_body_or_media_check
  check (
    char_length(trim(body)) >= 1
    or coalesce(cardinality(media_urls), 0) > 0
  );
