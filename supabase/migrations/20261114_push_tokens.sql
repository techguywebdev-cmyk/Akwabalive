-- TsaCoal phone app: one row per phone that can receive push alerts (reminders, tickets out, new shows)
create table if not exists public.push_tokens (
  token text primary key,                       -- the Expo push token for that phone
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text,                                -- android / ios
  enabled boolean not null default true,        -- off when the person turns alerts off or removes the app
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id) where enabled;

alter table public.push_tokens enable row level security;

-- People manage only their own phones; the website's daily jobs read with the service key
drop policy if exists "own push tokens: read" on public.push_tokens;
create policy "own push tokens: read" on public.push_tokens for select using (auth.uid() = user_id);
drop policy if exists "own push tokens: add" on public.push_tokens;
create policy "own push tokens: add" on public.push_tokens for insert with check (auth.uid() = user_id);
drop policy if exists "own push tokens: change" on public.push_tokens;
create policy "own push tokens: change" on public.push_tokens for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
