-- Artist photos: free Wikimedia photos found automatically, or ones the admin uploads (applied 2026-10-26)
create or replace function public.is_akwaaba_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and auth.uid()::text = (select value from app_secrets where name = 'ingest_organizer_id');
$$;
grant execute on function public.is_akwaaba_admin() to anon, authenticated;

create table if not exists public.artist_profiles (
  slug text primary key,
  photo_url text,
  photo_credit text,
  photo_license text,
  photo_source_url text,
  photo_source text check (photo_source in ('wikimedia', 'upload')),
  checked_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.artist_profiles enable row level security;
create policy "artist_profiles_select_all" on public.artist_profiles for select using (true);
create policy "artist_profiles_admin_insert" on public.artist_profiles for insert to authenticated with check (public.is_akwaaba_admin());
create policy "artist_profiles_admin_update" on public.artist_profiles for update to authenticated using (public.is_akwaaba_admin()) with check (public.is_akwaaba_admin());

create policy "artist_photos_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-images' and (storage.foldername(name))[1] = 'artists' and public.is_akwaaba_admin());
