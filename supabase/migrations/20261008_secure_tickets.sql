-- Akwaaba: lock down ticket creation
-- Run this in the Supabase SQL editor of the Akwaaba project.
--
-- After this, tickets (paid, free and gifted) can only be created by the server
-- (/api/payments/verify and /api/payments/webhook use the service role key,
-- which bypasses RLS). Browsers can still read their own tickets.

-- 1. One ticket per payment reference (stops double-issuing)
create unique index if not exists tickets_qr_code_unique
  on public.tickets (qr_code)
  where qr_code is not null;

-- 2. Row level security on tickets
alter table public.tickets enable row level security;

-- Remove every existing policy on tickets (names vary per project),
-- then recreate only the ones we want.
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'tickets'
  loop
    execute format('drop policy %I on public.tickets', p.policyname);
  end loop;
end $$;

-- Owners (and gift senders) can read
create policy "tickets_select_own"
  on public.tickets for select
  to authenticated
  using (auth.uid() = user_id or auth.uid() = gifted_by);

-- Public profiles (/u/[username]) show that person's upcoming tickets
create policy "tickets_select_public_profiles"
  on public.tickets for select
  using (
    status = 'active'
    and exists (select 1 from public.profiles p where p.id = user_id and p.is_public)
  );

-- No browser inserts at all: paid tickets, free RSVPs and gifts are all
-- issued by the server after verification.

-- No browser updates or deletes. Service role (server) is unaffected.

-- 3. (Optional, check first) ticket_tiers
-- Only enable RLS on ticket_tiers once the read + organizer policies below exist,
-- otherwise the public site can't read tiers and organizers can't save them:
-- alter table public.ticket_tiers enable row level security;
-- NOTE: organizers still need to insert/update/delete their own tiers from the
-- organizer pages. If ticket_tiers has no policies yet, add these:
--
-- create policy "tiers_public_read" on public.ticket_tiers for select using (true);
-- create policy "tiers_organizer_write" on public.ticket_tiers for all to authenticated
--   using (exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid()))
--   with check (exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid()));
