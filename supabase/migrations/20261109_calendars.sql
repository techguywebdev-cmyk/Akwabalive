-- Calendars: people make their own lists of events (e.g. "My Detty December"), public or private,
-- that others can like, rate, comment on and share.

create table if not exists public.calendars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  title text not null check (char_length(title) between 1 and 80),
  description text check (description is null or char_length(description) <= 400),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists calendars_owner_idx on public.calendars(owner_id);

create table if not exists public.calendar_events (
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  event_slug text not null,
  note text check (note is null or char_length(note) <= 200),
  added_at timestamptz not null default now(),
  primary key (calendar_id, event_slug)
);

create table if not exists public.calendar_likes (
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (calendar_id, user_id)
);

create table if not exists public.calendar_ratings (
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (calendar_id, user_id)
);

create table if not exists public.calendar_comments (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.calendar_comments(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  hidden boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists calendar_comments_cal_idx on public.calendar_comments(calendar_id);

-- Comments join profiles for names and photos
alter table public.calendar_comments drop constraint if exists calendar_comments_profile_fkey;
alter table public.calendar_comments add constraint calendar_comments_profile_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.calendars drop constraint if exists calendars_profile_fkey;
alter table public.calendars add constraint calendars_profile_fkey foreign key (owner_id) references public.profiles(id) on delete cascade;

alter table public.calendars enable row level security;
alter table public.calendar_events enable row level security;
alter table public.calendar_likes enable row level security;
alter table public.calendar_ratings enable row level security;
alter table public.calendar_comments enable row level security;

-- Who can see a calendar: anyone if public, the owner always
create or replace function public.can_see_calendar(cid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from calendars c where c.id = cid and (c.is_public or c.owner_id = auth.uid()));
$$;
create or replace function public.owns_calendar(cid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from calendars c where c.id = cid and c.owner_id = auth.uid());
$$;

drop policy if exists calendars_read on public.calendars;
create policy calendars_read on public.calendars for select using (is_public or owner_id = auth.uid());
drop policy if exists calendars_write on public.calendars;
create policy calendars_write on public.calendars for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists calendar_events_read on public.calendar_events;
create policy calendar_events_read on public.calendar_events for select using (public.can_see_calendar(calendar_id));
drop policy if exists calendar_events_write on public.calendar_events;
create policy calendar_events_write on public.calendar_events for all to authenticated using (public.owns_calendar(calendar_id)) with check (public.owns_calendar(calendar_id));

drop policy if exists calendar_likes_read on public.calendar_likes;
create policy calendar_likes_read on public.calendar_likes for select using (public.can_see_calendar(calendar_id));
drop policy if exists calendar_likes_write on public.calendar_likes;
create policy calendar_likes_write on public.calendar_likes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_see_calendar(calendar_id));

drop policy if exists calendar_ratings_read on public.calendar_ratings;
create policy calendar_ratings_read on public.calendar_ratings for select using (public.can_see_calendar(calendar_id));
drop policy if exists calendar_ratings_write on public.calendar_ratings;
create policy calendar_ratings_write on public.calendar_ratings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_see_calendar(calendar_id));

drop policy if exists calendar_comments_read on public.calendar_comments;
create policy calendar_comments_read on public.calendar_comments for select using (public.can_see_calendar(calendar_id) and (not hidden or user_id = auth.uid() or public.is_akwaaba_admin()));
drop policy if exists calendar_comments_insert on public.calendar_comments;
create policy calendar_comments_insert on public.calendar_comments for insert to authenticated with check (user_id = auth.uid() and public.can_see_calendar(calendar_id));
drop policy if exists calendar_comments_update on public.calendar_comments;
create policy calendar_comments_update on public.calendar_comments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists calendar_comments_delete on public.calendar_comments;
create policy calendar_comments_delete on public.calendar_comments for delete using (user_id = auth.uid() or public.owns_calendar(calendar_id) or public.is_akwaaba_admin());
drop trigger if exists calendar_comments_edit_guard on public.calendar_comments;
create trigger calendar_comments_edit_guard before update on public.calendar_comments for each row execute function public.comment_edit_guard();

-- Counts for lists and pages in one call: likes, rating, comments, events
create or replace function public.calendar_stats(ids uuid[]) returns table (calendar_id uuid, likes int, rating numeric, ratings int, comments int, events int)
language sql stable security definer set search_path = public as $$
  select c.id,
    (select count(*)::int from calendar_likes l where l.calendar_id = c.id),
    (select round(avg(stars)::numeric, 1) from calendar_ratings r where r.calendar_id = c.id),
    (select count(*)::int from calendar_ratings r where r.calendar_id = c.id),
    (select count(*)::int from calendar_comments m where m.calendar_id = c.id and not m.hidden),
    (select count(*)::int from calendar_events e where e.calendar_id = c.id)
  from calendars c where c.id = any(ids) and (c.is_public or c.owner_id = auth.uid());
$$;
grant execute on function public.calendar_stats(uuid[]) to anon, authenticated;

do $$ begin
  alter publication supabase_realtime add table public.calendar_comments;
exception when others then null;
end $$;
