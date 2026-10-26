-- Profile photos live in the public event-images bucket under avatars/<user id>/… (applied 2026-10-26)
create policy "avatars_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-images' and (storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text);
