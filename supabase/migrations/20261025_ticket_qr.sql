-- Akwaaba: secure tickets + scannable QR passes + door check-in
--
-- 1. Browsers can no longer create tickets (only the server, after payment).
-- 2. Each ticket's QR holds a link with a signed key: /t/<ticket id>?k=<key>.
--    The key is an HMAC of the ticket id with a secret that never leaves the database,
--    so a QR can't be forged from public data.
-- 3. Anyone scanning sees whether the ticket is valid; the event's organiser can
--    check it in once (status 'used', checked_in_at).

-- ── 1. Lock down ticket creation ────────────────────────────────────────
create unique index if not exists tickets_qr_code_unique on public.tickets (qr_code) where qr_code is not null;
alter table public.tickets enable row level security;
alter table public.tickets add column if not exists checked_in_at timestamptz;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'tickets' loop
    execute format('drop policy %I on public.tickets', p.policyname);
  end loop;
end $$;

create policy "tickets_select_own" on public.tickets for select to authenticated
  using (auth.uid() = user_id or auth.uid() = gifted_to or auth.uid() = gifted_by);

create policy "tickets_select_public_profiles" on public.tickets for select
  using (status = 'active' and exists (select 1 from public.profiles p where p.id = user_id and p.is_public));

-- ── 2. QR keys ──────────────────────────────────────────────────────────
insert into public.app_secrets (name, value)
values ('ticket_qr_secret', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (name) do nothing;

create or replace function public.ticket_qr_key(p_id uuid)
returns text language sql stable security definer set search_path = public, extensions as $$
  select substr(encode(extensions.hmac(p_id::text, (select value from app_secrets where name = 'ticket_qr_secret'), 'sha256'), 'hex'), 1, 24);
$$;
revoke all on function public.ticket_qr_key(uuid) from public, anon, authenticated;

-- The signed-in user's own tickets with their QR keys
create or replace function public.my_ticket_keys()
returns table (ticket_id uuid, qr_key text)
language sql stable security definer set search_path = public as $$
  select t.id, public.ticket_qr_key(t.id) from tickets t
   where auth.uid() is not null and (t.user_id = auth.uid() or t.gifted_to = auth.uid());
$$;
revoke all on function public.my_ticket_keys() from public;
grant execute on function public.my_ticket_keys() to authenticated;

-- ── 3. Scan + check in ──────────────────────────────────────────────────
create or replace function public.verify_ticket(p_id uuid, p_key text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t record; e record; holder text;
begin
  if p_key is null or p_key <> public.ticket_qr_key(p_id) then
    return jsonb_build_object('valid', false, 'reason', 'not_recognised');
  end if;
  select * into t from tickets where id = p_id;
  if not found then return jsonb_build_object('valid', false, 'reason', 'not_recognised'); end if;
  select id, title, slug, organizer_id, image_url into e from events where slug = t.event_slug;
  select split_part(coalesce(nullif(full_name, ''), username), ' ', 1) into holder
    from profiles where id = coalesce(t.gifted_to, t.user_id);
  return jsonb_build_object(
    'valid', t.status in ('active', 'used'),
    'reason', case when t.status = 'used' then 'already_used' when t.status = 'active' then 'ok' else t.status end,
    'event_title', t.event_title, 'event_slug', t.event_slug, 'event_date', t.event_date, 'event_venue', t.event_venue,
    'image', e.image_url, 'tier', t.ticket_tier, 'quantity', t.quantity, 'holder', holder,
    'status', t.status, 'checked_in_at', t.checked_in_at,
    'can_check_in', auth.uid() is not null and e.organizer_id = auth.uid()
  );
end $$;
revoke all on function public.verify_ticket(uuid, text) from public;
grant execute on function public.verify_ticket(uuid, text) to anon, authenticated;

create or replace function public.check_in_ticket(p_id uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t record; org uuid;
begin
  if p_key is null or p_key <> public.ticket_qr_key(p_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_recognised');
  end if;
  select * into t from tickets where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_recognised'); end if;
  select organizer_id into org from events where slug = t.event_slug;
  if auth.uid() is null or org is distinct from auth.uid() then
    return jsonb_build_object('ok', false, 'reason', 'not_organiser');
  end if;
  if t.status = 'used' then
    return jsonb_build_object('ok', false, 'reason', 'already_used', 'checked_in_at', t.checked_in_at);
  end if;
  if t.status <> 'active' then return jsonb_build_object('ok', false, 'reason', t.status); end if;
  update tickets set status = 'used', checked_in_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'checked_in_at', now());
end $$;
revoke all on function public.check_in_ticket(uuid, text) from public;
grant execute on function public.check_in_ticket(uuid, text) to authenticated;
