-- People can follow an event series (Rapperholic, Detty Rave…) (applied 2026-10-26)
create table if not exists public.series_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  series_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, series_slug)
);
create index if not exists series_follows_slug_idx on public.series_follows (series_slug);
alter table public.series_follows enable row level security;
create policy "series_follows_select_all" on public.series_follows for select using (true);
create policy "series_follows_insert_own" on public.series_follows for insert to authenticated with check (user_id = auth.uid());
create policy "series_follows_delete_own" on public.series_follows for delete to authenticated using (user_id = auth.uid());
