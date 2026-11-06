-- Organisers claiming events we imported: they ask, the admin checks, the event moves to their account
create table if not exists public.event_claims (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  role text not null,
  proof text not null,
  contact text,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (event_id, user_id)
);
alter table public.event_claims enable row level security;
create policy event_claims_insert_own on public.event_claims for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
create policy event_claims_read_own on public.event_claims for select to authenticated using (user_id = auth.uid() or public.is_akwaaba_admin());
create policy event_claims_admin_update on public.event_claims for update to authenticated using (public.is_akwaaba_admin()) with check (public.is_akwaaba_admin());

-- Admin only: approve a claim → the event becomes the claimant's (a hosted listing they manage)
create or replace function public.approve_event_claim(p_claim uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if not public.is_akwaaba_admin() then raise exception 'not allowed'; end if;
  select * into c from event_claims where id = p_claim and status = 'pending';
  if not found then raise exception 'claim not found'; end if;
  update events set organizer_id = c.user_id, updated_at = now() where id = c.event_id;
  update event_claims set status = 'approved', decided_at = now() where id = p_claim;
  update event_claims set status = 'declined', decided_at = now() where event_id = c.event_id and id <> p_claim and status = 'pending';
end $$;
revoke all on function public.approve_event_claim(uuid) from public, anon;
grant execute on function public.approve_event_claim(uuid) to authenticated;
