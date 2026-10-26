-- Organiser dashboard: sales and attendees for the signed-in organiser's own events.
-- Read-only, security definer; returns nothing for events the caller doesn't own.

create or replace function public.organiser_event_stats()
returns table (event_id uuid, slug text, tickets integer, people integer, revenue numeric, checked_in integer)
language sql stable security definer set search_path = public as $$
  select e.id, e.slug,
         count(t.id)::int,
         coalesce(sum(t.quantity), 0)::int,
         coalesce(sum(t.total_paid), 0),
         coalesce(sum(t.quantity) filter (where t.status = 'used'), 0)::int
    from events e
    left join tickets t on t.event_slug = e.slug and t.status in ('active', 'used')
   where auth.uid() is not null and e.organizer_id = auth.uid()
   group by e.id, e.slug;
$$;
revoke all on function public.organiser_event_stats() from public;
grant execute on function public.organiser_event_stats() to authenticated;

create or replace function public.organiser_event_tickets(p_event_id uuid)
returns table (ticket_id uuid, holder text, username text, avatar_url text, tier text, quantity integer,
               total_paid numeric, status text, checked_in_at timestamptz, bought_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, coalesce(nullif(p.full_name, ''), p.username, 'Guest'), p.username, p.avatar_url, t.ticket_tier, t.quantity,
         t.total_paid, t.status, t.checked_in_at, t.created_at
    from events e
    join tickets t on t.event_slug = e.slug and t.status in ('active', 'used')
    left join profiles p on p.id = coalesce(t.gifted_to, t.user_id)
   where e.id = p_event_id and auth.uid() is not null and e.organizer_id = auth.uid()
   order by t.created_at desc;
$$;
revoke all on function public.organiser_event_tickets(uuid) from public;
grant execute on function public.organiser_event_tickets(uuid) to authenticated;
