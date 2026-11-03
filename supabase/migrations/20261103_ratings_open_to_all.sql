-- Anyone signed in can rate an event once it has happened; an Akwaaba ticket marks the rating "verified"
create or replace function public.my_rating_status(p_slug text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare t record; r record; d text;
begin
  if auth.uid() is null then return jsonb_build_object('can_rate', false, 'reason', 'signed_out'); end if;
  select * into t from tickets
   where event_slug = p_slug and coalesce(gifted_to, user_id) = auth.uid() and status in ('active', 'used')
   order by (status = 'used') desc limit 1;
  select * into r from event_ratings where event_slug = p_slug and user_id = auth.uid();
  d := coalesce(t.event_date, (select e.date::text from events e where e.slug = p_slug limit 1));
  if d is not null and d ~ '^\d{4}-\d{2}-\d{2}' and left(d, 10)::date > current_date then
    return jsonb_build_object('can_rate', false, 'reason', 'not_yet', 'event_date', d);
  end if;
  return jsonb_build_object('can_rate', true, 'verified', t.id is not null,
    'rating', case when r.id is null then null else to_jsonb(r) - 'user_id' end);
end $function$;
