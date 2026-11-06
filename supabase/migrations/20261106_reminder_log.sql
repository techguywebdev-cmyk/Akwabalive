-- One reminder per person per show: the daily reminder run records what it sent
create table if not exists public.reminder_log (
  user_id uuid not null,
  event_slug text not null,
  kind text not null default 'day_before',
  sent_at timestamptz not null default now(),
  primary key (user_id, event_slug, kind)
);
alter table public.reminder_log enable row level security; -- server only (service role)
