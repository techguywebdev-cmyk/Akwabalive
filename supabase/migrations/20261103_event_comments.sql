-- The chat on an event page: questions, plans, who's going
create table if not exists public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists event_comments_slug_idx on public.event_comments (event_slug, created_at);
alter table public.event_comments enable row level security;
create policy "event_comments_read" on public.event_comments for select using (true);
create policy "event_comments_insert_own" on public.event_comments for insert to authenticated with check (auth.uid() = user_id);
create policy "event_comments_delete_own" on public.event_comments for delete to authenticated using (auth.uid() = user_id);
do $$ begin
  alter publication supabase_realtime add table public.event_comments;
exception when others then null; end $$;
