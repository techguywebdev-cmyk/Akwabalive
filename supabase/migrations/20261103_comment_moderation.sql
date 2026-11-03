-- Comment moderation: authors delete their own, the admin deletes anything, 3 reports hide a comment.
-- (Applied to production on 2026-11-03; see the PR for details.)
alter table public.event_comments add column if not exists hidden boolean not null default false;
alter table public.moment_comments add column if not exists hidden boolean not null default false;
drop policy if exists event_comments_read on public.event_comments;
create policy event_comments_read on public.event_comments for select using (not hidden or auth.uid() = user_id or public.is_akwaaba_admin());
drop policy if exists "Comments visible to all" on public.moment_comments;
create policy "Comments visible to all" on public.moment_comments for select using (not hidden or auth.uid() = user_id or public.is_akwaaba_admin());
drop policy if exists moment_comments_delete_own on public.moment_comments;
create policy moment_comments_delete_own on public.moment_comments for delete using (auth.uid() = user_id);
drop policy if exists event_comments_delete_admin on public.event_comments;
create policy event_comments_delete_admin on public.event_comments for delete using (public.is_akwaaba_admin());
drop policy if exists moment_comments_delete_admin on public.moment_comments;
create policy moment_comments_delete_admin on public.moment_comments for delete using (public.is_akwaaba_admin());
create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('event','moment')),
  comment_id uuid not null,
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason text check (reason is null or char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  unique (kind, comment_id, reporter_id)
);
alter table public.comment_reports enable row level security;
drop policy if exists comment_reports_insert on public.comment_reports;
create policy comment_reports_insert on public.comment_reports for insert with check (auth.uid() = reporter_id);
drop policy if exists comment_reports_admin_read on public.comment_reports;
create policy comment_reports_admin_read on public.comment_reports for select using (public.is_akwaaba_admin());
create or replace function public.hide_reported_comment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from comment_reports where kind = new.kind and comment_id = new.comment_id) >= 3 then
    if new.kind = 'event' then update event_comments set hidden = true where id = new.comment_id;
    else update moment_comments set hidden = true where id = new.comment_id; end if;
  end if;
  return new;
end $$;
drop trigger if exists comment_reports_hide on public.comment_reports;
create trigger comment_reports_hide after insert on public.comment_reports for each row execute function public.hide_reported_comment();
grant execute on function public.is_akwaaba_admin() to anon, authenticated;
