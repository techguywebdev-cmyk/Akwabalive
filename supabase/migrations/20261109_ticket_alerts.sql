-- "Notify me when tickets drop": people ask on shows with no ticket info yet; when a ticket link, dial code or
-- prices are added, each of them gets a notification (and the alert is closed).

create table if not exists public.ticket_alerts (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_slug text not null,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  primary key (user_id, event_slug)
);
alter table public.ticket_alerts enable row level security;
drop policy if exists "own ticket alerts" on public.ticket_alerts;
create policy "own ticket alerts" on public.ticket_alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notifications can now point at an event
alter table public.notifications add column if not exists event_slug text;
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('calendar_like', 'calendar_rating', 'calendar_comment', 'comment_reply', 'tickets_out'));

create or replace function public.notify_tickets_out(p_slug text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, kind, event_slug)
  select user_id, 'tickets_out', p_slug from ticket_alerts where event_slug = p_slug and notified_at is null;
  update ticket_alerts set notified_at = now() where event_slug = p_slug and notified_at is null;
end $$;

-- A ticket link or dial code appears on the event
create or replace function public.events_tickets_out() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (coalesce(new.ticket_url, '') <> '' and coalesce(old.ticket_url, '') = '')
     or (coalesce(new.ticket_source, '') <> '' and coalesce(old.ticket_source, '') = '') then
    perform notify_tickets_out(new.slug);
  end if;
  return new;
end $$;
drop trigger if exists events_tickets_out on public.events;
create trigger events_tickets_out after update of ticket_url, ticket_source on public.events
  for each row execute function public.events_tickets_out();

-- Prices are added (tickets sold on Akwaaba)
create or replace function public.tiers_tickets_out() returns trigger
language plpgsql security definer set search_path = public as $$
declare s text;
begin
  select slug into s from events where id = new.event_id;
  if s is not null then perform notify_tickets_out(s); end if;
  return new;
end $$;
drop trigger if exists ticket_tiers_tickets_out on public.ticket_tiers;
create trigger ticket_tiers_tickets_out after insert on public.ticket_tiers
  for each row execute function public.tiers_tickets_out();
