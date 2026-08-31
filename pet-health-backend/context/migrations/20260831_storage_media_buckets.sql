-- Private health/profile media + public Pet Feed listing media buckets.
-- Run in Supabase SQL Editor if upload-avatar returns "Bucket not found".

insert into storage.buckets (id, name, public)
values
  ('pet-health-private-media', 'pet-health-private-media', false),
  ('pet-feed-public-media', 'pet-feed-public-media', true)
on conflict (id) do nothing;

drop policy if exists "pet_images_storage_insert_own" on storage.objects;
drop policy if exists "pet_images_storage_select_public" on storage.objects;
drop policy if exists "private_media_storage_insert_own" on storage.objects;
drop policy if exists "private_media_storage_select_own" on storage.objects;
drop policy if exists "public_pet_feed_storage_insert_own" on storage.objects;
drop policy if exists "public_pet_feed_storage_select_public" on storage.objects;

create policy "private_media_storage_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'pet-health-private-media'
  and split_part(name, '/', 1) = (select auth.uid()::text)
);

create policy "private_media_storage_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'pet-health-private-media'
  and split_part(name, '/', 1) = (select auth.uid()::text)
);

create policy "public_pet_feed_storage_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'pet-feed-public-media'
  and split_part(name, '/', 1) = (select auth.uid()::text)
);

create policy "public_pet_feed_storage_select_public"
on storage.objects for select
to public
using (bucket_id = 'pet-feed-public-media');
