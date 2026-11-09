-- Notifications: someone liked, rated or commented on your calendar, or replied to your comment.
-- Written by triggers (never for your own actions); you read and mark your own.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,      -- who gets it
  actor_id uuid references auth.users(id) on delete cascade,             -- who did it
  kind text not null check (kind in ('calendar_like', 'calendar_rating', 'calendar_comment', 'comment_reply')),
  calendar_id uuid references public.calendars(id) on delete cascade,
  comment_id uuid references public.calendar_comments(id) on delete cascade,
  stars smallint,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread on public.notifications (user_id) where read_at is null;

-- The actor's name and avatar come from profiles
do $$ begin
  alter table public.notifications add constraint notifications_actor_profile_fkey foreign key (actor_id) references public.profiles(id) on delete cascade;
exception when duplicate_object then null; end $$;

alter table public.notifications enable row level security;
drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "mark own notifications read" on public.notifications;
create policy "mark own notifications read" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Likes and ratings on your calendar
create or replace function public.notify_calendar_reaction() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select owner_id into owner from calendars where id = new.calendar_id;
  if owner is null or owner = new.user_id then return new; end if;
  if tg_table_name = 'calendar_likes' then
    insert into notifications (user_id, actor_id, kind, calendar_id) values (owner, new.user_id, 'calendar_like', new.calendar_id);
  else
    -- One rating notification per person per calendar: changing your stars updates it
    delete from notifications where user_id = owner and actor_id = new.user_id and calendar_id = new.calendar_id and kind = 'calendar_rating';
    insert into notifications (user_id, actor_id, kind, calendar_id, stars) values (owner, new.user_id, 'calendar_rating', new.calendar_id, new.stars);
  end if;
  return new;
end $$;

drop trigger if exists calendar_likes_notify on public.calendar_likes;
create trigger calendar_likes_notify after insert on public.calendar_likes for each row execute function public.notify_calendar_reaction();
drop trigger if exists calendar_ratings_notify on public.calendar_ratings;
create trigger calendar_ratings_notify after insert or update of stars on public.calendar_ratings for each row execute function public.notify_calendar_reaction();

-- Comments: the calendar's owner hears about new comments; a reply also tells the person replied to
create or replace function public.notify_calendar_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid; parent_author uuid;
begin
  select owner_id into owner from calendars where id = new.calendar_id;
  if new.parent_id is not null then
    select user_id into parent_author from calendar_comments where id = new.parent_id;
    if parent_author is not null and parent_author <> new.user_id then
      insert into notifications (user_id, actor_id, kind, calendar_id, comment_id) values (parent_author, new.user_id, 'comment_reply', new.calendar_id, new.id);
    end if;
  end if;
  if owner is not null and owner <> new.user_id and owner is distinct from parent_author then
    insert into notifications (user_id, actor_id, kind, calendar_id, comment_id) values (owner, new.user_id, 'calendar_comment', new.calendar_id, new.id);
  end if;
  return new;
end $$;

drop trigger if exists calendar_comments_notify on public.calendar_comments;
create trigger calendar_comments_notify after insert on public.calendar_comments for each row execute function public.notify_calendar_comment();

-- Live updates for the unread dot
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
