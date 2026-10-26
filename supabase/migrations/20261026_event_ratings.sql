-- Event ratings: ticket holders rate a show from the day of the event (applied 2026-10-26)
create table if not exists public.event_ratings (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  overall smallint not null check (overall between 1 and 5),
  performance smallint check (performance between 1 and 5),
  sound smallint check (sound between 1 and 5),
  organisation smallint check (organisation between 1 and 5),
  vibe smallint check (vibe between 1 and 5),
  value smallint check (value between 1 and 5),
  review text check (char_length(review) <= 600),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_slug, user_id)
);
create index if not exists event_ratings_slug_idx on public.event_ratings (event_slug, created_at desc);
alter table public.event_ratings enable row level security;
create policy "event_ratings_select_all" on public.event_ratings for select using (true);
create policy "event_ratings_delete_own" on public.event_ratings for delete to authenticated using (user_id = auth.uid());

-- my_rating_status(slug): can_rate + reason ('signed_out' | 'no_ticket' | 'not_yet') + verified + existing rating
-- rate_event(slug, overall, performance, sound, organisation, vibe, value, review): upsert, checks the above
-- event_rating_summaries(slugs[]): count, averages, 5→1 distribution per event
-- event_reviews(slug, limit): reviews with name/avatar/verified
-- (function bodies as applied via the Supabase MCP; see the migration "event_ratings" in the project history)
