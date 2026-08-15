-- Favorites upsert previously required UPDATE RLS (missing) → 42501 INTERNAL_ERROR
-- when a user already liked a post. App now uses INSERT + ignore duplicate, but
-- keep an UPDATE policy so upsert clients remain safe.

drop policy if exists "pet_feed_favorites_update_own" on public.pet_feed_favorites;

create policy "pet_feed_favorites_update_own"
on public.pet_feed_favorites for update
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);
