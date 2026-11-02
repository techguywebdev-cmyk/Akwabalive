-- Where each moment's video comes from (YouTube channel), whether it's official, and whether it still plays (applied 2026-11-02)
alter table public.moments
  add column if not exists channel_name text,
  add column if not exists channel_url text,
  add column if not exists official boolean,
  add column if not exists available boolean not null default true,
  add column if not exists source_checked_at timestamptz;
