-- People can follow artists (applied 2026-10-26)
create table if not exists public.artist_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  artist_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_slug)
);
create index if not exists artist_follows_slug_idx on public.artist_follows (artist_slug);
alter table public.artist_follows enable row level security;
create policy "artist_follows_select_all" on public.artist_follows for select using (true);
create policy "artist_follows_insert_own" on public.artist_follows for insert to authenticated with check (user_id = auth.uid());
create policy "artist_follows_delete_own" on public.artist_follows for delete to authenticated using (user_id = auth.uid());
