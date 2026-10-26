-- Spotify link + image per artist (applied 2026-10-26)
alter table public.artist_profiles
  add column if not exists spotify_id text,
  add column if not exists spotify_url text,
  add column if not exists spotify_image text,
  add column if not exists spotify_checked_at timestamptz;
