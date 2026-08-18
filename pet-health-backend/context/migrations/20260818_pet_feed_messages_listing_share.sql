-- Listing reference cards live in the message thread (not a pinned header).

alter table public.pet_feed_messages
  add column if not exists listing_share jsonb;

alter table public.pet_feed_messages
  drop constraint if exists pet_feed_messages_body_check;

alter table public.pet_feed_messages
  drop constraint if exists pet_feed_messages_body_or_media_check;

alter table public.pet_feed_messages
  add constraint pet_feed_messages_body_or_media_or_listing_check
  check (
    char_length(trim(body)) >= 1
    or coalesce(cardinality(media_urls), 0) > 0
    or listing_share is not null
  );
