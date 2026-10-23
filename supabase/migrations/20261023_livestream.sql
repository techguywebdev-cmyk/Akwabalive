-- Livestreaming (Oct 2026)
-- Events can be streamed live through Cloudflare Stream. People who can't attend
-- buy a livestream ticket; organisers set their own stream tiers next to the
-- in-person ones. Run once in the Supabase SQL editor. Safe to re-run.

-- 1. Ticket tiers: in-person or stream, and how long a stream ticket can rewatch
alter table public.ticket_tiers
  add column if not exists kind text not null default 'in_person',
  add column if not exists replay_days integer;

do $$ begin
  alter table public.ticket_tiers
    add constraint ticket_tiers_kind_check check (kind in ('in_person', 'stream'));
exception when duplicate_object then null; end $$;

-- 2. Events: public stream facts (no secrets here)
alter table public.events
  add column if not exists stream_enabled boolean not null default false,
  -- 'idle' (not started), 'live', 'ended'
  add column if not exists stream_status text not null default 'idle',
  add column if not exists stream_started_at timestamptz,
  -- Free streams can simply be a YouTube link shown on the event page
  add column if not exists youtube_live_url text;

-- 3. Tickets remember which kind of tier they were bought for
alter table public.tickets
  add column if not exists tier_id uuid,
  add column if not exists kind text not null default 'in_person',
  add column if not exists replay_until timestamptz;

-- 4. Stream credentials, one row per streamed event. Holds the stream key, so it
--    is readable only by the event's organiser (and the server).
create table if not exists public.event_streams (
  event_id uuid primary key references public.events(id) on delete cascade,
  live_input_uid text not null,
  rtmps_url text not null,
  stream_key text not null,
  srt_url text,
  recording_uid text,
  created_at timestamptz not null default now()
);
alter table public.event_streams enable row level security;
drop policy if exists "event_streams_organiser_read" on public.event_streams;
create policy "event_streams_organiser_read"
  on public.event_streams for select
  using (exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid()));
-- No browser writes: the server creates rows with the service role.

-- 5. One device at a time per stream ticket (server-only)
create table if not exists public.stream_viewers (
  ticket_id uuid primary key references public.tickets(id) on delete cascade,
  session_id text not null,
  last_seen timestamptz not null default now()
);
alter table public.stream_viewers enable row level security;

-- 6. Live chat. Anyone can read an event's chat; only the server writes
--    (it checks the sender has a ticket first).
create table if not exists public.stream_messages (
  id bigint generated always as identity primary key,
  event_slug text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text,
  tier_name text,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists stream_messages_event_idx on public.stream_messages (event_slug, created_at desc);
alter table public.stream_messages enable row level security;
drop policy if exists "stream_messages_read" on public.stream_messages;
create policy "stream_messages_read" on public.stream_messages for select using (true);

-- Live chat updates over Supabase Realtime
do $$ begin
  alter publication supabase_realtime add table public.stream_messages;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- 7. Server-side settings (e.g. the Cloudflare Stream signing key). Service role only.
create table if not exists public.app_secrets (
  name text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;

-- 8. Organisers edit their own tiers in place (the edit page now updates tiers
--    instead of deleting and re-creating them, so ticket links stay valid).
drop policy if exists "ticket_tiers_organiser_update" on public.ticket_tiers;
create policy "ticket_tiers_organiser_update"
  on public.ticket_tiers for update
  using (exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid()));
