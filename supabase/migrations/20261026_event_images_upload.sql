-- Signed-in users can upload event flyers to the public event-images bucket (events/ folder);
-- they can replace or remove only files they uploaded. (Applied 2026-10-26.)
create policy "event_images_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-images' and (storage.foldername(name))[1] = 'events');
create policy "event_images_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'event-images' and owner = auth.uid());
create policy "event_images_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'event-images' and owner = auth.uid());
update storage.buckets set file_size_limit = 10485760, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif'] where id = 'event-images';
