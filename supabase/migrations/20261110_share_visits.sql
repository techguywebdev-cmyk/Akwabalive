-- Who brings people: every visit that arrives on someone's shared link (?by=username), and whether that visitor
-- later signed up or signed in. Anyone can record a visit; only the admin can read the totals.

create table if not exists public.share_visits (
  id bigint generated always as identity primary key,
  by_username text not null,
  path text not null,
  visitor text not null,            -- a random id kept in the visitor's browser
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists share_visits_by on public.share_visits (by_username, created_at desc);
create unique index if not exists share_visits_once on public.share_visits (by_username, path, visitor);
alter table public.share_visits enable row level security;
drop policy if exists "anyone records a visit" on public.share_visits;
create policy "anyone records a visit" on public.share_visits for insert to anon, authenticated
  with check (user_id is null and length(by_username) <= 40 and length(path) <= 200 and length(visitor) <= 64);
drop policy if exists "admin reads visits" on public.share_visits;
create policy "admin reads visits" on public.share_visits for select to authenticated using (public.is_akwaaba_admin());

-- A visitor who signs in: their earlier visits count as people this sharer brought in
create or replace function public.claim_share_visits(p_visitor text) returns void
language sql security definer set search_path = public as $$
  update share_visits set user_id = auth.uid()
  where visitor = p_visitor and user_id is null and auth.uid() is not null
    and by_username <> coalesce((select username from profiles where id = auth.uid()), '');
$$;
grant execute on function public.claim_share_visits(text) to authenticated;

-- The board: per sharer, people who opened their links and people who then joined, over the last N days
create or replace function public.share_leaderboard(p_days int default 30)
returns table (by_username text, full_name text, avatar_url text, visitors bigint, joined bigint, last_visit timestamptz)
language sql security definer set search_path = public as $$
  select v.by_username, p.full_name, p.avatar_url,
         count(distinct v.visitor), count(distinct v.user_id), max(v.created_at)
  from share_visits v left join profiles p on p.username = v.by_username
  where public.is_akwaaba_admin() and v.created_at > now() - make_interval(days => p_days)
  group by v.by_username, p.full_name, p.avatar_url
  order by count(distinct v.visitor) desc, max(v.created_at) desc
  limit 100;
$$;
grant execute on function public.share_leaderboard(int) to authenticated;
