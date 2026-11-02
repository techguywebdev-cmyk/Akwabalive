-- Official video finder (applied 2026-11-02)
alter table public.moments
  add column if not exists status text not null default 'live' check (status in ('live', 'pending', 'rejected')),
  add column if not exists published_at timestamptz,
  add column if not exists found_by text;
create index if not exists moments_youtube_idx on public.moments (youtube_id);

create table if not exists public.official_channels (
  slug text primary key,
  kind text not null check (kind in ('artist', 'series')),
  channel_id text,
  channel_title text,
  subscribers bigint,
  confirmed boolean not null default false,
  checked_at timestamptz,
  scanned_at timestamptz
);
alter table public.official_channels enable row level security;
create policy "official_channels_select_all" on public.official_channels for select using (true);
create policy "official_channels_admin_write" on public.official_channels for all to authenticated using (public.is_akwaaba_admin()) with check (public.is_akwaaba_admin());

create policy "moments_admin_update" on public.moments for update to authenticated using (public.is_akwaaba_admin()) with check (public.is_akwaaba_admin());
