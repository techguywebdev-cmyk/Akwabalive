-- Event views and feed impressions (one per person per event per day per kind), read back as counts.
create table if not exists public.event_views (
  event_slug text not null,
  viewer text not null check (char_length(viewer) between 8 and 64),
  day date not null default current_date,
  kind text not null check (kind in ('view','impression')),
  primary key (event_slug, viewer, day, kind)
);
create index if not exists event_views_slug_day on public.event_views (event_slug, day);
alter table public.event_views enable row level security;

create or replace function public.track_event(p_slug text, p_viewer text, p_kind text)
returns void language sql security definer set search_path = public as $$
  insert into event_views (event_slug, viewer, kind)
  select p_slug, p_viewer, p_kind
  where p_kind in ('view','impression') and char_length(coalesce(p_viewer,'')) between 8 and 64 and char_length(coalesce(p_slug,'')) between 1 and 200
  on conflict do nothing;
$$;

create or replace function public.event_counts(p_slugs text[])
returns table (event_slug text, views_7d bigint, views_total bigint, seen_7d bigint, going bigint)
language sql stable security definer set search_path = public as $$
  select s.slug,
    (select count(*) from event_views v where v.event_slug = s.slug and v.kind = 'view' and v.day > current_date - 7),
    (select count(*) from event_views v where v.event_slug = s.slug and v.kind = 'view'),
    (select count(distinct v.viewer) from event_views v where v.event_slug = s.slug and v.day > current_date - 7),
    (select count(*) from event_attendance a where a.event_slug = s.slug and a.status = 'going')
  from unnest(p_slugs[1:60]) as s(slug);
$$;

grant execute on function public.track_event(text, text, text) to anon, authenticated;
grant execute on function public.event_counts(text[]) to anon, authenticated;
