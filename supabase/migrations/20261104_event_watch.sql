-- Event watcher: official site per event, last-checked time, and the line-up news it finds (admin only)
alter table public.events add column if not exists official_url text;
alter table public.events add column if not exists watched_at timestamptz;
create table if not exists public.event_updates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null default 'lineup_add' check (kind in ('lineup_add')),
  value text not null,
  sources jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','applied','dismissed')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (event_id, kind, value)
);
alter table public.event_updates enable row level security;
create policy event_updates_admin on public.event_updates for all using (public.is_akwaaba_admin()) with check (public.is_akwaaba_admin());
