-- Spotify followers / popularity, used to order artists (applied 2026-10-26)
alter table public.artist_profiles
  add column if not exists spotify_followers integer,
  add column if not exists spotify_popularity smallint;
