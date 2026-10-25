-- Event importer: lets the server add events found on ticket sites without the
-- service-role key. Both functions check a shared secret kept in app_secrets
-- (name = 'ingest_secret'); imported events wait in review (status = pending_review)
-- under the account named by app_secrets 'ingest_organizer_id'.
--
-- Setup (once):
--   insert into app_secrets(name, value) values ('ingest_secret', '<same as INGEST_SECRET on Vercel>');
--   insert into app_secrets(name, value) values ('ingest_organizer_id', '<profiles.id that reviews imports>');

create or replace function public.ingest_known_urls(p_secret text, p_urls text[])
returns text[]
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret is distinct from (select value from app_secrets where name = 'ingest_secret') then
    raise exception 'unauthorized';
  end if;
  return coalesce((select array_agg(source_url) from events where source_url = any(p_urls)), '{}');
end $$;

create or replace function public.ingest_import_event(p_secret text, p_event jsonb, p_tiers jsonb default '[]'::jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_status text;
  v_org uuid;
  v_key text := lower(regexp_replace(coalesce(p_event->>'title', ''), '[^a-zA-Z0-9]', '', 'g'));
begin
  if p_secret is null or p_secret is distinct from (select value from app_secrets where name = 'ingest_secret') then
    raise exception 'unauthorized';
  end if;
  select value::uuid into v_org from app_secrets where name = 'ingest_organizer_id';
  if v_org is null then raise exception 'ingest_organizer_id not set'; end if;

  -- Already have it: same source page, or same title on the same day (listed on two sites)
  select id, status into v_id, v_status from events where source_url = p_event->>'source_url' limit 1;
  if v_id is null then
    select id, status into v_id, v_status from events
     where date = (p_event->>'date')::date
       and lower(regexp_replace(title, '[^a-zA-Z0-9]', '', 'g')) = v_key
     limit 1;
  end if;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'status', v_status, 'duplicate', true);
  end if;

  insert into events (organizer_id, title, slug, description, category, city, region, venue, area, address,
                      lat, lng, date, date_label, time, image_url, status, listing_type,
                      ticket_url, ticket_source, source_url, lineup)
  values (v_org,
          p_event->>'title', p_event->>'slug', p_event->>'description', coalesce(p_event->>'category', 'concert'),
          coalesce(p_event->>'city', 'accra'), p_event->>'region', coalesce(p_event->>'venue', 'Venue to be announced'),
          p_event->>'area', p_event->>'address',
          nullif(p_event->>'lat', '')::numeric, nullif(p_event->>'lng', '')::numeric,
          (p_event->>'date')::date, p_event->>'date_label', p_event->>'time', p_event->>'image_url',
          'pending_review', 'listed', p_event->>'ticket_url', p_event->>'ticket_source', p_event->>'source_url',
          case when jsonb_typeof(p_event->'lineup') = 'array'
               then array(select jsonb_array_elements_text(p_event->'lineup')) end)
  returning id into v_id;

  insert into ticket_tiers (event_id, name, description, price, quantity, sold)
  select v_id, t->>'name', t->>'description', (t->>'price')::numeric, 100000, 0
    from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb)) t
   where coalesce(t->>'name', '') <> '' and (t->>'price') ~ '^[0-9]+(\.[0-9]+)?$';

  return jsonb_build_object('id', v_id, 'status', 'pending_review', 'duplicate', false);
end $$;

revoke all on function public.ingest_known_urls(text, text[]) from public;
revoke all on function public.ingest_import_event(text, jsonb, jsonb) from public;
grant execute on function public.ingest_known_urls(text, text[]) to anon, authenticated;
grant execute on function public.ingest_import_event(text, jsonb, jsonb) to anon, authenticated;
