-- Enable Supabase Realtime for Pet Feed DMs (run in SQL Editor after 005).
-- IMPORTANT: run this on the SAME project as backend SUPABASE_URL and
-- frontend EXPO_PUBLIC_SUPABASE_URL (project refs must match).
-- Dashboard alternative: Database → Publications → supabase_realtime → add tables.
-- Safe to re-run: skips tables already in the publication.
--
-- Verify after run:
--   select * from pg_publication_tables where pubname = 'supabase_realtime'
--     and tablename in ('pet_feed_messages', 'pet_feed_conversations');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pet_feed_messages'
  ) then
    alter publication supabase_realtime add table public.pet_feed_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pet_feed_conversations'
  ) then
    alter publication supabase_realtime add table public.pet_feed_conversations;
  end if;
end $$;
