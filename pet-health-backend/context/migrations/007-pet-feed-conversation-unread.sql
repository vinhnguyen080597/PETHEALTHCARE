-- Unread tracking for Pet Feed DMs (run in Supabase SQL Editor on existing projects).

alter table public.pet_feed_conversations
  add column if not exists last_message_sender_user_id text,
  add column if not exists sen_last_read_at timestamptz,
  add column if not exists breeder_last_read_at timestamptz;

-- Participants may update their own last-read cursor (and preview fields stay service-role for send).
drop policy if exists "pet_feed_conversations_update_participant_read" on public.pet_feed_conversations;
create policy "pet_feed_conversations_update_participant_read"
on public.pet_feed_conversations for update
to authenticated
using (auth.uid()::text = sen_user_id or auth.uid()::text = breeder_user_id)
with check (auth.uid()::text = sen_user_id or auth.uid()::text = breeder_user_id);
